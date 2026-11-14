import { conTransaccion, consultar } from '@/lib/db/conexion';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { registrarEvento } from '@/lib/datos/eventos';
import type { DatosVenta, FilaVenta, ResultadoVenta } from '@/lib/datos/tipos';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { normalizarReferencia, normalizarTalla } from '@/lib/reglas/producto';
import { cantidadTrasVenta, validarVenta } from '@/lib/reglas/venta';
import { createHash } from 'node:crypto';
import { validarPagosVenta } from '@/lib/reglas/finanzasComerciales';
import type { Rol } from '@/lib/reglas/roles';
import type { DatosVentaComercial, ResultadoVentaComercial } from '@/lib/datos/tipos';

type FilaProductoBloqueado = {
  id: string;
  referencia: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
};

export async function registrarVenta(
  datos: DatosVenta,
  usuarioId: string,
): Promise<ResultadoVenta> {
  validarVenta(datos);

  return conTransaccion(async (tx) => {
    const filasProducto = await tx.query<FilaProductoBloqueado>(
      `SELECT id, referencia, talla, cantidad,
              precio_venta AS "precioVenta"
       FROM productos
       WHERE clave_referencia = $1 AND clave_talla = $2 AND activo = true
       FOR UPDATE`,
      [normalizarReferencia(datos.referencia), normalizarTalla(datos.talla)],
    );
    const producto = filasProducto.rows[0];
    if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

    const cantidadResultante = cantidadTrasVenta(producto.cantidad, datos.cantidad);
    const ventas = await tx.query<FilaVenta>(
      `INSERT INTO ventas
         (producto_id, usuario_id, referencia, talla, cantidad, precio_venta, fecha_venta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, producto_id AS "productoId", usuario_id AS "usuarioId",
                 referencia, talla, cantidad, precio_venta AS "precioVenta",
                 fecha_venta AS "fechaVenta"`,
      [
        producto.id,
        usuarioId,
        producto.referencia,
        producto.talla,
        datos.cantidad,
        producto.precioVenta,
        hoyBogota(),
      ],
    );
    const venta = ventas.rows[0];
    if (!venta) throw new Error('La base de datos no devolvió la venta recién registrada.');

    await tx.query(`UPDATE productos SET cantidad = $1 WHERE id = $2`, [
      cantidadResultante,
      producto.id,
    ]);
    await registrarEvento(tx, {
      tipo: 'VENTA_REGISTRADA',
      productoId: producto.id,
      usuarioId,
      detalle: {
        ventaId: venta.id,
        cantidad: datos.cantidad,
        cantidadResultante,
      },
    });

    return {
      venta: { ...venta, nombreUsuario: null },
      cantidadResultante,
      agotado: cantidadResultante === 0,
    };
  });
}

function huellaVenta(datos: DatosVentaComercial): string {
  const normalizados = {
    referencia: normalizarReferencia(datos.referencia),
    talla: normalizarTalla(datos.talla),
    cantidad: datos.cantidad,
    tipoPago: datos.tipoPago,
    pagos: [...datos.pagos].sort((a, b) => a.metodo.localeCompare(b.metodo)),
    clienteId: datos.clienteId ?? null,
    fechaVencimiento: datos.fechaVencimiento ?? null,
  };
  return createHash('sha256').update(JSON.stringify(normalizados)).digest('hex');
}

export async function registrarVentaConPago(
  datos: DatosVentaComercial,
  usuarioId: string,
  rol: Rol,
): Promise<ResultadoVentaComercial> {
  validarVenta(datos);
  if (datos.tipoPago === 'CREDITO' && rol !== 'dueno') {
    throw new ErrorDeNegocio('SIN_PERMISO');
  }
  if (datos.tipoPago === 'CREDITO' && !datos.clienteId) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (datos.clienteId && rol !== 'dueno') {
    throw new ErrorDeNegocio('SIN_PERMISO');
  }

  const huella = huellaVenta(datos);
  return conTransaccion(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `venta:${datos.claveIdempotencia}`,
    ]);
    const repetida = await tx.query<{
      id: number;
      productoId: string;
      usuarioId: string | null;
      referencia: string;
      talla: string;
      cantidad: number;
      precioVenta: number;
      fechaVenta: string;
      huella: string;
      cantidadActual: number;
    }>(
      `SELECT v.id, v.producto_id AS "productoId", v.usuario_id AS "usuarioId",
              v.referencia, v.talla, v.cantidad, v.precio_venta AS "precioVenta",
              v.fecha_venta AS "fechaVenta", v.huella_idempotencia AS huella,
              p.cantidad AS "cantidadActual"
       FROM public.ventas v
       JOIN public.productos p ON p.id = v.producto_id
       WHERE v.clave_idempotencia = $1`,
      [datos.claveIdempotencia],
    );
    const ventaExistente = repetida.rows[0];
    if (ventaExistente) {
      if (ventaExistente.huella !== huella) {
        throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
      }
      const total = Number(BigInt(ventaExistente.precioVenta) * BigInt(ventaExistente.cantidad));
      const totalPagado = await tx.query<{ total: string }>(
        'SELECT COALESCE(sum(monto), 0)::text AS total FROM public.pagos_venta WHERE venta_id = $1',
        [ventaExistente.id],
      );
      const pagado = Number(totalPagado.rows[0]?.total ?? 0);
      return {
        venta: {
          id: ventaExistente.id,
          productoId: ventaExistente.productoId,
          usuarioId: ventaExistente.usuarioId,
          nombreUsuario: null,
          referencia: ventaExistente.referencia,
          talla: ventaExistente.talla,
          cantidad: ventaExistente.cantidad,
          precioVenta: ventaExistente.precioVenta,
          fechaVenta: ventaExistente.fechaVenta,
        },
        cantidadResultante: ventaExistente.cantidadActual,
        agotado: ventaExistente.cantidadActual === 0,
        total,
        totalPagado: pagado,
        saldoPendiente: total - pagado,
        repetida: true,
      };
    }

    const filasProducto = await tx.query<FilaProductoBloqueado>(
      `SELECT id, referencia, talla, cantidad,
              precio_venta AS "precioVenta"
       FROM productos
       WHERE clave_referencia = $1 AND clave_talla = $2 AND activo = true
       FOR UPDATE`,
      [normalizarReferencia(datos.referencia), normalizarTalla(datos.talla)],
    );
    const producto = filasProducto.rows[0];
    if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

    const totalBigInt = BigInt(producto.precioVenta) * BigInt(datos.cantidad);
    if (totalBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS');
    }
    const total = Number(totalBigInt);
    const { totalPagado, saldoPendiente } = validarPagosVenta(
      total,
      datos.pagos,
      datos.tipoPago === 'CREDITO',
    );
    if (datos.tipoPago === 'PAGADA' && saldoPendiente !== 0) {
      throw new ErrorDeNegocio('PAGO_VENTA_NO_COINCIDE');
    }
    if (datos.tipoPago === 'CREDITO' && saldoPendiente === 0) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS');
    }
    if (datos.clienteId) {
      const cliente = await tx.query(
        'SELECT id FROM public.clientes WHERE id = $1 AND activo = true FOR SHARE',
        [datos.clienteId],
      );
      if (!cliente.rows[0]) throw new ErrorDeNegocio('CLIENTE_NO_ENCONTRADO');
    }

    let cajaId: string | null = null;
    if (datos.pagos.length > 0) {
      const caja = await tx.query<{ id: string }>(
        `SELECT id FROM public.cajas
         WHERE estado = 'ABIERTA'
         LIMIT 1 FOR UPDATE`,
      );
      cajaId = caja.rows[0]?.id ?? null;
      if (!cajaId) throw new ErrorDeNegocio('CAJA_NO_ABIERTA');
    }

    const cantidadResultante = cantidadTrasVenta(producto.cantidad, datos.cantidad);
    const insertadas = await tx.query<FilaVenta>(
      `INSERT INTO public.ventas
         (producto_id, usuario_id, referencia, talla, cantidad, precio_venta,
          fecha_venta, clave_idempotencia, huella_idempotencia, pago_registrado, cliente_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)
       RETURNING id, producto_id AS "productoId", usuario_id AS "usuarioId",
                 referencia, talla, cantidad, precio_venta AS "precioVenta",
                 fecha_venta AS "fechaVenta"`,
      [
        producto.id,
        usuarioId,
        producto.referencia,
        producto.talla,
        datos.cantidad,
        producto.precioVenta,
        hoyBogota(),
        datos.claveIdempotencia,
        huella,
        datos.clienteId ?? null,
      ],
    );
    const venta = insertadas.rows[0];
    if (!venta) throw new Error('La base de datos no devolvió la venta recién registrada.');

    for (const pago of datos.pagos) {
      const pagoInsertado = await tx.query<{ id: number }>(
        `INSERT INTO public.pagos_venta (venta_id, metodo, monto, creado_por)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [venta.id, pago.metodo, pago.monto, usuarioId],
      );
      const pagoId = pagoInsertado.rows[0]?.id;
      if (!pagoId || !cajaId) throw new Error('No se pudo asociar el pago a la caja abierta.');
      await tx.query(
        `INSERT INTO public.caja_movimientos
           (caja_id, tipo, metodo, monto, concepto, pago_venta_id, creado_por)
         VALUES ($1, 'INGRESO', $2, $3, $4, $5, $6)`,
        [cajaId, pago.metodo, pago.monto, `Venta #${venta.id}`, pagoId, usuarioId],
      );
    }

    if (datos.tipoPago === 'CREDITO' && datos.clienteId) {
      await tx.query(
        `INSERT INTO public.cuentas_por_cobrar
           (venta_id, cliente_id, fecha_vencimiento, creado_por)
         VALUES ($1, $2, $3, $4)`,
        [venta.id, datos.clienteId, datos.fechaVencimiento ?? null, usuarioId],
      );
    }

    await tx.query('UPDATE productos SET cantidad = $1 WHERE id = $2', [
      cantidadResultante,
      producto.id,
    ]);
    await registrarEvento(tx, {
      tipo: 'VENTA_REGISTRADA',
      productoId: producto.id,
      usuarioId,
      detalle: {
        ventaId: venta.id,
        cantidad: datos.cantidad,
        cantidadResultante,
        tipoPago: datos.tipoPago,
        total,
        totalPagado,
        saldoPendiente,
      },
    });

    return {
      venta: { ...venta, nombreUsuario: null },
      cantidadResultante,
      agotado: cantidadResultante === 0,
      total,
      totalPagado,
      saldoPendiente,
      repetida: false,
    };
  });
}

async function consultarVentas(
  filtros: {
    referencia?: string;
    desde?: string;
    hasta?: string;
  },
  limitar: boolean,
): Promise<FilaVenta[]> {
  const condiciones: string[] = [];
  const valores: Array<string | number> = [];

  if (filtros.referencia?.trim()) {
    valores.push(`%${normalizarReferencia(filtros.referencia)}%`);
    condiciones.push(`upper(btrim(v.referencia)) LIKE $${valores.length}`);
  }
  if (filtros.desde) {
    valores.push(filtros.desde);
    condiciones.push(`v.fecha_venta >= $${valores.length}`);
  }
  if (filtros.hasta) {
    valores.push(filtros.hasta);
    condiciones.push(`v.fecha_venta <= $${valores.length}`);
  }
  if (limitar) valores.push(LIMITE_LISTADO);

  return consultar<FilaVenta>(
    `SELECT v.id, v.producto_id AS "productoId", v.usuario_id AS "usuarioId",
            u.nombre AS "nombreUsuario", v.referencia, v.talla, v.cantidad,
            v.precio_venta AS "precioVenta", v.fecha_venta AS "fechaVenta"
     FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY v.fecha_venta DESC, v.id DESC
     ${limitar ? `LIMIT $${valores.length}` : ''}`,
    valores,
  );
}

export async function listarVentas(filtros: {
  referencia?: string;
  desde?: string;
  hasta?: string;
}): Promise<FilaVenta[]> {
  return consultarVentas(filtros, true);
}

export async function exportarVentas(filtros: {
  referencia?: string;
  desde?: string;
  hasta?: string;
}): Promise<FilaVenta[]> {
  return consultarVentas(filtros, false);
}
