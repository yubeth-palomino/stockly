import type { PoolClient } from 'pg';
import { createHash } from 'node:crypto';
import { conTransaccion, consultar } from '@/lib/db/conexion';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import type {
  AjusteComercialValido,
  FiltrosInventarioComercialValidos,
  ProductoComercialValido,
  VentaComercialValida,
} from '@/lib/validacion/esquemas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import {
  calcularCantidadAjustada,
  calcularCostoPromedioPonderado,
  normalizarColor,
  normalizarCodigoComercial,
  normalizarReferenciaComercial,
  normalizarTallaComercial,
} from '@/lib/reglas/comercial';
import type { Rol } from '@/lib/reglas/roles';

type FilaDisponibilidadEsquema = { disponible: boolean };
type FilaAccesoEmpresa = { rol: Rol };
type FilaCatalogo = {
  id: string;
  marca: string;
  descripcion: string;
  categoria: string | null;
  activo: boolean;
};
type FilaVariante = { id: string };
type FilaExistencia = {
  cantidad: number;
  costoPromedio: number | null;
  costoPromedioValidado: boolean;
};
type FilaMovimientoIdempotente = {
  sucursalId: string;
  varianteId: string;
  usuarioId: string | null;
  cantidadDelta: number;
  costoUnitario: number | null;
  motivo: string | null;
  cantidadNueva: number;
};
type FilaVentaIdempotente = {
  id: number;
  huellaIdempotencia: string | null;
  totalBruto: number;
  descuentoTotal: number;
};
type FilaStockVenta = {
  varianteId: string;
  referencia: string;
  talla: string;
  color: string | null;
  precioVenta: number;
  cantidad: number;
  costoPromedio: number | null;
  costoPromedioValidado: boolean;
};
type FilaInventarioComercial = {
  varianteId: string;
  productoId: string;
  referencia: string;
  marca: string;
  descripcion: string;
  categoria: string | null;
  talla: string;
  color: string | null;
  sku: string | null;
  codigoBarras: string | null;
  precioVenta: number;
  cantidad: number;
  costoPromedio?: number | null;
  costoPromedioValidado?: boolean;
};
type ErrorPostgres = { code?: string; constraint?: string };

function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function traducirErrorVariante(error: unknown): never {
  if (
    esErrorPostgres(error) &&
    error.code === '23505' &&
    [
      'ux_variantes_sku_empresa',
      'ux_variantes_codigo_barras_empresa',
      'ux_variantes_catalogo_talla_color',
    ].includes(error.constraint ?? '')
  ) {
    throw new ErrorDeNegocio('PRODUCTO_DUPLICADO');
  }
  throw error;
}

async function exigirEsquemaComercial(
  consultaSql: Pick<PoolClient, 'query'>,
): Promise<void> {
  const resultado = await consultaSql.query<FilaDisponibilidadEsquema>(
    `SELECT
       to_regclass('public.empresas') IS NOT NULL
       AND to_regclass('public.empresas_usuarios') IS NOT NULL
       AND to_regclass('public.usuarios_sucursales') IS NOT NULL
       AND to_regclass('public.productos_catalogo') IS NOT NULL
       AND to_regclass('public.variantes_producto') IS NOT NULL
       AND to_regclass('public.existencias') IS NOT NULL
       AND to_regclass('public.movimientos_inventario') IS NOT NULL
       AND to_regclass('public.ventas_comerciales') IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'ventas_comerciales'
           AND column_name = 'huella_idempotencia'
       ) AS disponible`,
  );
  if (!resultado.rows[0]?.disponible) {
    throw new ErrorDeNegocio('FUNCIONALIDAD_NO_ACTIVA');
  }
}

async function obtenerAccesoSucursal(
  tx: PoolClient,
  datos: { empresaId: string; sucursalId: string; usuarioId: string },
): Promise<Rol> {
  const resultado = await tx.query<FilaAccesoEmpresa>(
    `SELECT eu.rol
     FROM empresas_usuarios eu
     JOIN sucursales s
       ON s.empresa_id = eu.empresa_id
      AND s.id = $3
      AND s.activa = true
     WHERE eu.empresa_id = $1
       AND eu.usuario_id = $2
       AND eu.activo = true
       AND (
         eu.alcance_sucursales = 'todas'
         OR EXISTS (
           SELECT 1
           FROM usuarios_sucursales us
           WHERE us.empresa_id = eu.empresa_id
             AND us.usuario_id = eu.usuario_id
             AND us.sucursal_id = s.id
         )
       )
     LIMIT 1`,
    [datos.empresaId, datos.usuarioId, datos.sucursalId],
  );
  const acceso = resultado.rows[0];
  if (!acceso) throw new ErrorDeNegocio('SIN_PERMISO');
  return acceso.rol;
}

async function exigirAccesoSucursal(
  tx: PoolClient,
  datos: { empresaId: string; sucursalId: string; usuarioId: string },
  requiereDueno: boolean,
): Promise<Rol> {
  await exigirEsquemaComercial(tx);
  const rol = await obtenerAccesoSucursal(tx, datos);
  if (requiereDueno && rol !== 'dueno') throw new ErrorDeNegocio('SIN_PERMISO');
  return rol;
}

export async function listarInventarioComercial(
  filtros: FiltrosInventarioComercialValidos,
  usuario: { id: string; rol: Rol },
): Promise<FilaInventarioComercial[]> {
  const esquema = await consultar<FilaDisponibilidadEsquema>(
    `SELECT
       to_regclass('public.empresas') IS NOT NULL
       AND to_regclass('public.empresas_usuarios') IS NOT NULL
       AND to_regclass('public.usuarios_sucursales') IS NOT NULL
       AND to_regclass('public.productos_catalogo') IS NOT NULL
       AND to_regclass('public.variantes_producto') IS NOT NULL
       AND to_regclass('public.existencias') IS NOT NULL
       AND to_regclass('public.movimientos_inventario') IS NOT NULL
       AND to_regclass('public.ventas_comerciales') IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'ventas_comerciales'
           AND column_name = 'huella_idempotencia'
       ) AS disponible`,
  );
  if (!esquema[0]?.disponible) throw new ErrorDeNegocio('FUNCIONALIDAD_NO_ACTIVA');

  const acceso = await consultar<FilaAccesoEmpresa>(
    `SELECT
       eu.rol
     FROM empresas_usuarios eu
     JOIN sucursales s
       ON s.empresa_id = eu.empresa_id
      AND s.id = $3
      AND s.activa = true
     WHERE eu.empresa_id = $1
       AND eu.usuario_id = $2
       AND eu.activo = true
       AND (
         eu.alcance_sucursales = 'todas'
         OR EXISTS (
           SELECT 1
           FROM usuarios_sucursales us
           WHERE us.empresa_id = eu.empresa_id
             AND us.usuario_id = eu.usuario_id
             AND us.sucursal_id = s.id
         )
       )
     LIMIT 1`,
    [filtros.empresaId, usuario.id, filtros.sucursalId],
  );
  const permiso = acceso[0];
  if (!permiso) throw new ErrorDeNegocio('SIN_PERMISO');

  const puedeVerCostos = usuario.rol === 'dueno' && permiso.rol === 'dueno';
  const condiciones = [
    'pc.empresa_id = $1',
    'e.sucursal_id = $2',
    'pc.activo = true',
    'vp.activa = true',
  ];
  const valores: Array<string | number | boolean> = [filtros.empresaId, filtros.sucursalId];

  if (filtros.referencia) {
    valores.push(`%${normalizarReferenciaComercial(filtros.referencia)}%`);
    condiciones.push(`pc.clave_ref LIKE $${valores.length}`);
  }
  if (filtros.talla) {
    valores.push(`%${normalizarTallaComercial(filtros.talla)}%`);
    condiciones.push(
      `upper(regexp_replace(btrim(vp.talla), '[[:space:]]+', '', 'g')) LIKE $${valores.length}`,
    );
  }
  if (filtros.color) {
    valores.push(`%${normalizarColor(filtros.color)}%`);
    condiciones.push(
      `upper(regexp_replace(btrim(vp.color), '[[:space:]]+', ' ', 'g')) LIKE $${valores.length}`,
    );
  }
  if (filtros.soloDisponibles) condiciones.push('e.cantidad > 0');
  valores.push(LIMITE_LISTADO);

  const columnasCosto = puedeVerCostos
    ? ', e.costo_promedio_unitario AS "costoPromedio", e.costo_promedio_validado AS "costoPromedioValidado"'
    : '';
  return consultar<FilaInventarioComercial>(
    `SELECT vp.id AS "varianteId", pc.id AS "productoId",
            pc.referencia, pc.marca, pc.descripcion, pc.categoria,
            vp.talla, vp.color, vp.sku, vp.codigo_barras AS "codigoBarras",
            vp.precio_venta AS "precioVenta", e.cantidad${columnasCosto}
     FROM existencias e
     JOIN variantes_producto vp
       ON vp.empresa_id = e.empresa_id AND vp.id = e.variante_id
     JOIN productos_catalogo pc
       ON pc.empresa_id = vp.empresa_id AND pc.id = vp.producto_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY pc.clave_ref, vp.talla, vp.color
     LIMIT $${valores.length}`,
    valores,
  );
}

export async function crearProductoComercial(
  datos: ProductoComercialValido,
  usuarioId: string,
): Promise<{ productoId: string; varianteId: string }> {
  try {
    return await conTransaccion(async (tx) => {
      await exigirAccesoSucursal(
        tx,
        { empresaId: datos.empresaId, sucursalId: datos.sucursalId, usuarioId },
        true,
      );

      const referencia = normalizarReferenciaComercial(datos.referencia);
      const marca = datos.marca.trim();
      const descripcion = datos.descripcion.trim();
      const categoria = datos.categoria?.trim() || null;
      await tx.query(
        `INSERT INTO productos_catalogo (empresa_id, referencia, marca, descripcion, categoria)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (empresa_id, clave_ref) DO NOTHING`,
        [datos.empresaId, referencia, marca, descripcion, categoria],
      );
      const catalogos = await tx.query<FilaCatalogo>(
        `SELECT id, marca, descripcion, categoria, activo
         FROM productos_catalogo
         WHERE empresa_id = $1 AND clave_ref = $2
         FOR UPDATE`,
        [datos.empresaId, referencia],
      );
      const catalogo = catalogos.rows[0];
      if (!catalogo) throw new Error('No se pudo recuperar el catálogo recién creado.');
      if (
        !catalogo.activo ||
        catalogo.marca.trim().toLowerCase() !== marca.toLowerCase() ||
        catalogo.descripcion.trim() !== descripcion ||
        catalogo.categoria !== categoria
      ) {
        throw new ErrorDeNegocio('REFERENCIA_CATALOGO_INCONSISTENTE');
      }

      const variantes = await tx.query<FilaVariante>(
        `INSERT INTO variantes_producto (
           empresa_id, producto_id, talla, color, sku, codigo_barras, precio_venta
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          datos.empresaId,
          catalogo.id,
          normalizarTallaComercial(datos.variante.talla),
          normalizarColor(datos.variante.color),
          normalizarCodigoComercial(datos.variante.sku),
          normalizarCodigoComercial(datos.variante.codigoBarras),
          datos.variante.precioVenta,
        ],
      );
      const variante = variantes.rows[0];
      if (!variante) throw new Error('La base de datos no devolvió la variante recién creada.');

      await tx.query(
        `INSERT INTO existencias (empresa_id, sucursal_id, variante_id)
         VALUES ($1, $2, $3)`,
        [datos.empresaId, datos.sucursalId, variante.id],
      );
      return { productoId: catalogo.id, varianteId: variante.id };
    });
  } catch (error) {
    return traducirErrorVariante(error);
  }
}

export async function ajustarExistenciasComercial(
  datos: AjusteComercialValido,
  usuarioId: string,
): Promise<{ varianteId: string; cantidad: number; repetida: boolean }> {
  return conTransaccion(async (tx) => {
    await exigirAccesoSucursal(
      tx,
      { empresaId: datos.empresaId, sucursalId: datos.sucursalId, usuarioId },
      true,
    );
    await tx.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [
      datos.empresaId,
      datos.claveIdempotencia,
    ]);

    const movimientosPrevios = await tx.query<FilaMovimientoIdempotente>(
      `SELECT sucursal_id AS "sucursalId", variante_id AS "varianteId",
              usuario_id AS "usuarioId", cantidad_delta AS "cantidadDelta",
              costo_unitario AS "costoUnitario", motivo,
              cantidad_nueva AS "cantidadNueva"
       FROM movimientos_inventario
       WHERE empresa_id = $1 AND clave_idempotencia = $2`,
      [datos.empresaId, datos.claveIdempotencia],
    );
    const movimientoPrevio = movimientosPrevios.rows[0];
    if (movimientoPrevio) {
      const mismoContenido =
        movimientoPrevio.sucursalId === datos.sucursalId &&
        movimientoPrevio.varianteId === datos.varianteId &&
        movimientoPrevio.usuarioId === usuarioId &&
        movimientoPrevio.cantidadDelta === datos.delta &&
        movimientoPrevio.costoUnitario === (datos.costoUnitario ?? null) &&
        movimientoPrevio.motivo === datos.motivo;
      if (!mismoContenido) throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
      return {
        varianteId: datos.varianteId,
        cantidad: movimientoPrevio.cantidadNueva,
        repetida: true,
      };
    }

    const existencias = await tx.query<FilaExistencia>(
      `SELECT cantidad, costo_promedio_unitario AS "costoPromedio",
              costo_promedio_validado AS "costoPromedioValidado"
       FROM existencias
       WHERE empresa_id = $1 AND sucursal_id = $2 AND variante_id = $3
       FOR UPDATE`,
      [datos.empresaId, datos.sucursalId, datos.varianteId],
    );
    const existencia = existencias.rows[0];
    if (!existencia) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

    const nuevaCantidad = calcularCantidadAjustada(existencia.cantidad, datos.delta);
    let nuevoCosto = existencia.costoPromedio;
    let costoValidado = existencia.costoPromedioValidado;
    if (datos.delta > 0) {
      if (datos.costoUnitario === undefined) throw new ErrorDeNegocio('DATOS_INVALIDOS');
      nuevoCosto = calcularCostoPromedioPonderado({
        cantidadActual: existencia.cantidad,
        costoPromedioActual: existencia.costoPromedio,
        costoPromedioValidado: existencia.costoPromedioValidado,
        cantidadEntrada: datos.delta,
        costoUnitarioEntrada: datos.costoUnitario,
      });
      costoValidado = true;
    }

    await tx.query(
      `UPDATE existencias
       SET cantidad = $1, costo_promedio_unitario = $2,
           costo_promedio_validado = $3, updated_at = NOW()
       WHERE empresa_id = $4 AND sucursal_id = $5 AND variante_id = $6`,
      [
        nuevaCantidad,
        nuevoCosto,
        costoValidado,
        datos.empresaId,
        datos.sucursalId,
        datos.varianteId,
      ],
    );
    await tx.query(
      `INSERT INTO movimientos_inventario (
         empresa_id, sucursal_id, variante_id, usuario_id, tipo,
         cantidad_anterior, cantidad_delta, cantidad_nueva, costo_unitario,
         motivo, clave_idempotencia
       )
       VALUES ($1, $2, $3, $4, 'AJUSTE', $5, $6, $7, $8, $9, $10)`,
      [
        datos.empresaId,
        datos.sucursalId,
        datos.varianteId,
        usuarioId,
        existencia.cantidad,
        datos.delta,
        nuevaCantidad,
        datos.costoUnitario ?? null,
        datos.motivo,
        datos.claveIdempotencia,
      ],
    );
    return { varianteId: datos.varianteId, cantidad: nuevaCantidad, repetida: false };
  });
}

function calcularImporteUnidades(cantidad: number, precio: number): number {
  const importe = BigInt(cantidad) * BigInt(precio);
  if (importe > BigInt(Number.MAX_SAFE_INTEGER)) throw new ErrorDeNegocio('DATOS_INVALIDOS');
  return Number(importe);
}

function huellaVenta(datos: VentaComercialValida): string {
  const contenido = JSON.stringify({
    empresaId: datos.empresaId.toLowerCase(),
    sucursalId: datos.sucursalId.toLowerCase(),
    lineas: datos.lineas.map((linea) => ({
      varianteId: linea.varianteId.toLowerCase(),
      cantidad: linea.cantidad,
      descuentoLinea: linea.descuentoLinea,
    })),
    pagos: datos.pagos.map((pago) => ({
      metodo: pago.metodo,
      monto: pago.monto,
      referencia: pago.referencia ?? null,
    })),
  });
  return createHash('sha256').update(contenido).digest('hex');
}

export async function registrarVentaComercial(
  datos: VentaComercialValida,
  usuarioId: string,
): Promise<{
  ventaId: number;
  totalBruto: number;
  descuentoTotal: number;
  totalPagado: number;
  repetida: boolean;
}> {
  const huella = huellaVenta(datos);
  return conTransaccion(async (tx) => {
    await exigirAccesoSucursal(
      tx,
      { empresaId: datos.empresaId, sucursalId: datos.sucursalId, usuarioId },
      false,
    );
    await tx.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [
      datos.empresaId,
      datos.claveIdempotencia,
    ]);

    const ventasPrevias = await tx.query<FilaVentaIdempotente>(
      `SELECT id, huella_idempotencia AS "huellaIdempotencia",
              total_bruto AS "totalBruto", descuento_total AS "descuentoTotal"
       FROM ventas_comerciales
       WHERE empresa_id = $1 AND clave_idempotencia = $2`,
      [datos.empresaId, datos.claveIdempotencia],
    );
    const ventaPrevia = ventasPrevias.rows[0];
    if (ventaPrevia) {
      if (ventaPrevia.huellaIdempotencia !== huella) {
        throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
      }
      return {
        ventaId: ventaPrevia.id,
        totalBruto: ventaPrevia.totalBruto,
        descuentoTotal: ventaPrevia.descuentoTotal,
        totalPagado: ventaPrevia.totalBruto - ventaPrevia.descuentoTotal,
        repetida: true,
      };
    }

    const varianteIds = datos.lineas.map((linea) => linea.varianteId);
    const existencias = await tx.query<FilaStockVenta>(
      `SELECT vp.id AS "varianteId", pc.referencia, vp.talla, vp.color,
              vp.precio_venta AS "precioVenta", e.cantidad,
              e.costo_promedio_unitario AS "costoPromedio",
              e.costo_promedio_validado AS "costoPromedioValidado"
       FROM existencias e
       JOIN variantes_producto vp
         ON vp.empresa_id = e.empresa_id AND vp.id = e.variante_id
       JOIN productos_catalogo pc
         ON pc.empresa_id = vp.empresa_id AND pc.id = vp.producto_id
       WHERE e.empresa_id = $1
         AND e.sucursal_id = $2
         AND vp.id = ANY($3::uuid[])
         AND vp.activa = true
         AND pc.activo = true
       ORDER BY vp.id
       FOR UPDATE OF e`,
      [datos.empresaId, datos.sucursalId, varianteIds],
    );
    const porVariante = new Map(
      existencias.rows.map((existencia) => [existencia.varianteId, existencia]),
    );
    if (porVariante.size !== datos.lineas.length) {
      throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
    }

    let totalBruto = 0;
    let descuentoTotal = 0;
    for (const linea of datos.lineas) {
      const existencia = porVariante.get(linea.varianteId);
      if (!existencia) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
      const importe = calcularImporteUnidades(linea.cantidad, existencia.precioVenta);
      if (linea.descuentoLinea > importe) throw new ErrorDeNegocio('DATOS_INVALIDOS');
      totalBruto += importe;
      descuentoTotal += linea.descuentoLinea;
      if (!Number.isSafeInteger(totalBruto) || !Number.isSafeInteger(descuentoTotal)) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS');
      }
    }
    const totalPagado = totalBruto - descuentoTotal;
    const sumaPagos = datos.pagos.reduce((suma, pago) => suma + BigInt(pago.monto), 0n);
    if (totalPagado <= 0 || sumaPagos !== BigInt(totalPagado)) {
      throw new ErrorDeNegocio('PAGO_VENTA_NO_COINCIDE');
    }

    for (const linea of datos.lineas) {
      const existencia = porVariante.get(linea.varianteId);
      if (!existencia) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
      calcularCantidadAjustada(existencia.cantidad, -linea.cantidad);
    }

    const ventas = await tx.query<FilaVentaIdempotente>(
      `INSERT INTO ventas_comerciales (
         empresa_id, sucursal_id, usuario_id, estado, fecha_venta,
         total_bruto, descuento_total, clave_idempotencia, huella_idempotencia
       )
       VALUES ($1, $2, $3, 'COMPLETADA', $4, $5, $6, $7, $8)
       RETURNING id, huella_idempotencia AS "huellaIdempotencia",
                 total_bruto AS "totalBruto", descuento_total AS "descuentoTotal"`,
      [
        datos.empresaId,
        datos.sucursalId,
        usuarioId,
        hoyBogota(),
        totalBruto,
        descuentoTotal,
        datos.claveIdempotencia,
        huella,
      ],
    );
    const venta = ventas.rows[0];
    if (!venta) throw new Error('La base de datos no devolvió la venta recién registrada.');

    for (const [indice, linea] of datos.lineas.entries()) {
      const existencia = porVariante.get(linea.varianteId);
      if (!existencia) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
      const cantidadNueva = calcularCantidadAjustada(existencia.cantidad, -linea.cantidad);
      const costoRegistrado =
        existencia.costoPromedioValidado && existencia.costoPromedio !== null;
      await tx.query(
        `INSERT INTO ventas_comerciales_detalle (
           empresa_id, venta_id, numero_linea, variante_id, referencia_snapshot,
           talla_snapshot, color_snapshot, cantidad, precio_unitario, descuento_linea,
           costo_unitario_historico, estado_costo_historico
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          datos.empresaId,
          String(venta.id),
          indice + 1,
          existencia.varianteId,
          existencia.referencia,
          existencia.talla,
          existencia.color,
          linea.cantidad,
          existencia.precioVenta,
          linea.descuentoLinea,
          costoRegistrado ? existencia.costoPromedio : null,
          costoRegistrado ? 'REGISTRADO' : 'NO_REGISTRADO',
        ],
      );
      await tx.query(
        `UPDATE existencias SET cantidad = $1, updated_at = NOW()
         WHERE empresa_id = $2 AND sucursal_id = $3 AND variante_id = $4`,
        [cantidadNueva, datos.empresaId, datos.sucursalId, existencia.varianteId],
      );
      await tx.query(
        `INSERT INTO movimientos_inventario (
           empresa_id, sucursal_id, variante_id, usuario_id, tipo,
           cantidad_anterior, cantidad_delta, cantidad_nueva, costo_unitario,
           origen_tipo, origen_id, clave_idempotencia
         )
         VALUES ($1, $2, $3, $4, 'VENTA', $5, $6, $7, $8, 'ventas_comerciales', $9, $10)`,
        [
          datos.empresaId,
          datos.sucursalId,
          existencia.varianteId,
          usuarioId,
          existencia.cantidad,
          -linea.cantidad,
          cantidadNueva,
          costoRegistrado ? existencia.costoPromedio : null,
          venta.id,
          `${datos.claveIdempotencia}:${existencia.varianteId}`,
        ],
      );
    }

    for (const pago of datos.pagos) {
      await tx.query(
        `INSERT INTO pagos_venta (empresa_id, venta_id, metodo, monto, referencia)
         VALUES ($1, $2, $3, $4, $5)`,
        [datos.empresaId, venta.id, pago.metodo, pago.monto, pago.referencia ?? null],
      );
    }
    return {
      ventaId: venta.id,
      totalBruto,
      descuentoTotal,
      totalPagado,
      repetida: false,
    };
  });
}
