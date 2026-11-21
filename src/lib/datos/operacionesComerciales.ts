import { createHash } from 'node:crypto';
import { conTransaccion, consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { calcularEfectivoEsperado, type MetodoPago } from '@/lib/reglas/finanzasComerciales';
import type { Rol } from '@/lib/reglas/roles';

type Transaccion = import('pg').PoolClient;
type Identificador = { id: string };
type FilaContacto = {
  id: string;
  nombre: string;
  identificacion: string | null;
  contacto?: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  observaciones: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};
type FilaMovimiento = {
  tipo: 'INGRESO' | 'EGRESO';
  metodo: MetodoPago;
  monto: string;
};
type FilaCaja = {
  id: string;
  estado: 'ABIERTA' | 'CERRADA';
  montoApertura: string;
  montoEsperado: string | null;
  montoContado: string | null;
  diferencia: string | null;
  abiertaPor: string | null;
  cerradaPor: string | null;
  abiertaPorNombre: string | null;
  cerradaPorNombre: string | null;
  abiertaEn: string;
  cerradaEn: string | null;
  observacionApertura: string | null;
  observacionCierre: string | null;
};

function huella(datos: unknown): string {
  return createHash('sha256').update(JSON.stringify(datos)).digest('hex');
}

function importe(valor: string | number | null, nombre: string): number {
  const numero = Number(valor ?? 0);
  if (!Number.isSafeInteger(numero)) {
    throw new RangeError(`El importe de ${nombre} superó el rango seguro de enteros.`);
  }
  return numero;
}

function fechaBogota(valor: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(valor));
}

function validarRolDueno(rol: Rol): void {
  if (rol !== 'dueno') throw new ErrorDeNegocio('SIN_PERMISO');
}

function trasladarDuplicadoContacto(error: unknown, tipo: 'cliente' | 'proveedor'): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    const codigo = tipo === 'cliente' ? 'CLIENTE_DUPLICADO' : 'PROVEEDOR_DUPLICADO';
    throw new ErrorDeNegocio(codigo);
  }
  throw error;
}

async function cajaAbierta(tx: Transaccion, bloquear = true): Promise<Identificador | null> {
  const resultado = await tx.query<Identificador>(
    `SELECT id FROM public.cajas
     WHERE estado = 'ABIERTA'
     LIMIT 1 ${bloquear ? 'FOR UPDATE' : ''}`,
  );
  return resultado.rows[0] ?? null;
}

async function consultarMovimientosCaja(cajaId: string): Promise<
  Array<{
    id: string;
    tipo: 'INGRESO' | 'EGRESO';
    metodo: MetodoPago;
    monto: number;
    concepto: string;
    origen: 'VENTA' | 'ABONO' | 'MANUAL';
    creadoPor: string | null;
    creadoPorNombre: string | null;
    createdAt: string;
  }>
> {
  const filas = await consultar<{
    id: string;
    tipo: 'INGRESO' | 'EGRESO';
    metodo: MetodoPago;
    monto: string;
    concepto: string;
    origen: 'VENTA' | 'ABONO' | 'MANUAL';
    creadoPor: string | null;
    creadoPorNombre: string | null;
    createdAt: string;
  }>(
    `SELECT m.id, m.tipo, m.metodo, m.monto::text AS monto, m.concepto,
            CASE WHEN m.pago_venta_id IS NOT NULL THEN 'VENTA'
                 WHEN m.abono_id IS NOT NULL THEN 'ABONO'
                 ELSE 'MANUAL' END AS origen,
            m.creado_por AS "creadoPor", u.nombre AS "creadoPorNombre",
            m.created_at::text AS "createdAt"
     FROM public.caja_movimientos m
     LEFT JOIN public.usuarios u ON u.id = m.creado_por
     WHERE m.caja_id = $1
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT 300`,
    [cajaId],
  );
  return filas.map((fila) => ({ ...fila, monto: importe(fila.monto, 'movimiento de caja') }));
}

async function consultarResumenMovimientosCaja(cajaId: string) {
  const filas = await consultar<{
    tipo: 'INGRESO' | 'EGRESO';
    metodo: MetodoPago;
    origen: 'VENTA' | 'ABONO' | 'MANUAL';
    monto: string;
  }>(
    `SELECT tipo, metodo,
            CASE WHEN pago_venta_id IS NOT NULL THEN 'VENTA'
                 WHEN abono_id IS NOT NULL THEN 'ABONO'
                 ELSE 'MANUAL' END AS origen,
            sum(monto)::text AS monto
     FROM public.caja_movimientos
     WHERE caja_id = $1
     GROUP BY tipo, metodo, origen`,
    [cajaId],
  );
  return filas.map((fila) => ({ ...fila, monto: importe(fila.monto, 'resumen de caja') }));
}

async function mapearCaja(fila: FilaCaja, conMovimientos = true) {
  const [movimientos, resumen] = conMovimientos
    ? await Promise.all([
        consultarMovimientosCaja(fila.id),
        consultarResumenMovimientosCaja(fila.id),
      ])
    : [[], []];
  const saldoEsperado =
    fila.estado === 'CERRADA'
      ? importe(fila.montoEsperado, 'caja esperada')
      : calcularEfectivoEsperado(importe(fila.montoApertura, 'apertura'), resumen);
  const porMetodo = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'].map((metodo) => {
    const monto = resumen.reduce((suma, movimiento) => {
      if (movimiento.metodo !== metodo) return suma;
      return suma + BigInt(movimiento.monto) * (movimiento.tipo === 'INGRESO' ? 1n : -1n);
    }, 0n);
    return { metodo, monto: importe(monto.toString(), 'movimientos por medio') };
  });
  const ingresosPorOrigen = (origen: 'VENTA' | 'ABONO') =>
    ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'].map((metodo) => ({
      metodo,
      monto: importe(
        resumen
          .reduce(
            (suma, movimiento) =>
              movimiento.origen === origen &&
              movimiento.tipo === 'INGRESO' &&
              movimiento.metodo === metodo
                ? suma + BigInt(movimiento.monto)
                : suma,
            0n,
          )
          .toString(),
        `${origen.toLowerCase()} recibido`,
      ),
    }));
  return {
    id: fila.id,
    estado: fila.estado,
    montoApertura: importe(fila.montoApertura, 'apertura'),
    montoEsperado: saldoEsperado,
    montoContado: fila.montoContado === null ? null : importe(fila.montoContado, 'conteo'),
    diferencia: fila.diferencia === null ? null : importe(fila.diferencia, 'diferencia'),
    abiertaPor: fila.abiertaPor,
    cerradaPor: fila.cerradaPor,
    abiertaPorNombre: fila.abiertaPorNombre,
    cerradaPorNombre: fila.cerradaPorNombre,
    abiertaEn: fila.abiertaEn,
    cerradaEn: fila.cerradaEn,
    observacionApertura: fila.observacionApertura,
    observacionCierre: fila.observacionCierre,
    porMetodo,
    ventasRecibidasPorMetodo: ingresosPorOrigen('VENTA'),
    abonosRecibidosPorMetodo: ingresosPorOrigen('ABONO'),
    movimientos,
  };
}

const columnasCaja = `id, estado, monto_apertura::text AS "montoApertura",
  monto_esperado::text AS "montoEsperado", monto_contado::text AS "montoContado",
  diferencia::text AS diferencia, abierta_por AS "abiertaPor",
  cerrada_por AS "cerradaPor", abierta_en::text AS "abiertaEn",
  (SELECT nombre FROM public.usuarios WHERE id = abierta_por) AS "abiertaPorNombre",
  (SELECT nombre FROM public.usuarios WHERE id = cerrada_por) AS "cerradaPorNombre",
  cerrada_en::text AS "cerradaEn", observacion_apertura AS "observacionApertura",
  observacion_cierre AS "observacionCierre"`;

export async function obtenerCajaActual(rol: Rol) {
  validarRolDueno(rol);
  const filas = await consultar<FilaCaja>(
    `SELECT ${columnasCaja} FROM public.cajas
     WHERE estado = 'ABIERTA' LIMIT 1`,
  );
  return filas[0] ? mapearCaja(filas[0]) : null;
}

export async function listarHistorialCajas(rol: Rol) {
  validarRolDueno(rol);
  const filas = await consultar<FilaCaja>(
    `SELECT ${columnasCaja} FROM public.cajas
     WHERE estado = 'CERRADA'
     ORDER BY cerrada_en DESC, id DESC
     LIMIT 100`,
  );
  return Promise.all(filas.map((fila) => mapearCaja(fila, false)));
}

export async function obtenerDetalleCaja(id: string, rol: Rol) {
  validarRolDueno(rol);
  const filas = await consultar<FilaCaja>(
    `SELECT ${columnasCaja} FROM public.cajas
     WHERE id = $1 AND estado = 'CERRADA'`,
    [id],
  );
  if (!filas[0]) throw new ErrorDeNegocio('CAJA_NO_ENCONTRADA');
  return mapearCaja(filas[0]);
}

export async function abrirCaja(
  datos: {
    montoApertura: number;
    claveApertura: string;
    observacion?: string | undefined;
  },
  usuarioId: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  try {
    const cajaId = await conTransaccion(async (tx) => {
      await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `apertura-caja:${datos.claveApertura}`,
      ]);
      const repetida = await tx.query<{
        id: string;
        montoApertura: string;
        observacionApertura: string | null;
        abiertaPor: string | null;
      }>(
        `SELECT id, monto_apertura::text AS "montoApertura",
                observacion_apertura AS "observacionApertura",
                abierta_por AS "abiertaPor"
         FROM public.cajas WHERE clave_apertura = $1`,
        [datos.claveApertura],
      );
      const anterior = repetida.rows[0];
      if (anterior) {
        if (
          importe(anterior.montoApertura, 'apertura') !== datos.montoApertura ||
          anterior.observacionApertura !== (datos.observacion ?? null) ||
          anterior.abiertaPor !== usuarioId
        ) {
          throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
        }
        return anterior.id;
      }

      const abierta = await cajaAbierta(tx);
      if (abierta) throw new ErrorDeNegocio('CAJA_YA_ABIERTA');
      const insertada = await tx.query<Identificador>(
        `INSERT INTO public.cajas
           (estado, monto_apertura, abierta_por, observacion_apertura, clave_apertura)
         VALUES ('ABIERTA', $1, $2, $3, $4)
         RETURNING id`,
        [datos.montoApertura, usuarioId, datos.observacion ?? null, datos.claveApertura],
      );
      const id = insertada.rows[0]?.id;
      if (!id) throw new Error('La base de datos no devolvió la caja recién abierta.');
      return id;
    });
    const fila = await consultar<FilaCaja>(
      `SELECT ${columnasCaja} FROM public.cajas WHERE id = $1`,
      [cajaId],
    );
    if (!fila[0]) throw new Error('No se pudo consultar la caja recién abierta.');
    return mapearCaja(fila[0]);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505' &&
      'constraint' in error &&
      error.constraint === 'ux_cajas_una_abierta'
    ) {
      throw new ErrorDeNegocio('CAJA_YA_ABIERTA');
    }
    throw error;
  }
}

export async function registrarMovimientoCaja(
  datos: {
    tipo: 'INGRESO' | 'EGRESO';
    metodo: MetodoPago;
    monto: number;
    concepto: string;
    claveIdempotencia: string;
  },
  usuarioId: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  const huellaMovimiento = huella({
    tipo: datos.tipo,
    metodo: datos.metodo,
    monto: datos.monto,
    concepto: datos.concepto.trim(),
    usuarioId,
  });
  const movimientoId = await conTransaccion(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `movimiento-caja:${datos.claveIdempotencia}`,
    ]);
    const repetido = await tx.query<{ id: string; huella: string | null }>(
      `SELECT id, huella_idempotencia AS huella
       FROM public.caja_movimientos WHERE clave_idempotencia = $1`,
      [datos.claveIdempotencia],
    );
    if (repetido.rows[0]) {
      if (repetido.rows[0].huella !== huellaMovimiento) {
        throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
      }
      return repetido.rows[0].id;
    }

    const caja = await cajaAbierta(tx);
    if (!caja) throw new ErrorDeNegocio('CAJA_NO_ABIERTA');
    if (datos.tipo === 'EGRESO' && datos.metodo === 'EFECTIVO') {
      const [apertura, movimientos] = await Promise.all([
        tx.query<{ monto: string }>(
          'SELECT monto_apertura::text AS monto FROM public.cajas WHERE id = $1',
          [caja.id],
        ),
        tx.query<FilaMovimiento>(
          `SELECT tipo, metodo, monto::text AS monto
           FROM public.caja_movimientos WHERE caja_id = $1`,
          [caja.id],
        ),
      ]);
      const efectivoDisponible = calcularEfectivoEsperado(
        importe(apertura.rows[0]?.monto ?? null, 'apertura'),
        movimientos.rows.map((movimiento) => ({
          ...movimiento,
          monto: importe(movimiento.monto, 'movimiento de caja'),
        })),
      );
      if (datos.monto > efectivoDisponible) {
        throw new ErrorDeNegocio('CAJA_EFECTIVO_INSUFICIENTE');
      }
    }
    const insertado = await tx.query<Identificador>(
      `INSERT INTO public.caja_movimientos
         (caja_id, tipo, metodo, monto, concepto, clave_idempotencia,
          huella_idempotencia, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        caja.id,
        datos.tipo,
        datos.metodo,
        datos.monto,
        datos.concepto.trim(),
        datos.claveIdempotencia,
        huellaMovimiento,
        usuarioId,
      ],
    );
    const id = insertado.rows[0]?.id;
    if (!id) throw new Error('La base de datos no devolvió el movimiento de caja.');
    return id;
  });
  return { movimientoId };
}

export async function cerrarCaja(
  datos: {
    montoContado: number;
    claveCierre: string;
    observacion?: string | undefined;
  },
  usuarioId: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  const huellaCierre = huella({
    montoContado: datos.montoContado,
    observacion: datos.observacion ?? null,
    usuarioId,
  });
  const cajaId = await conTransaccion(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `cierre-caja:${datos.claveCierre}`,
    ]);
    const repetida = await tx.query<{ id: string; huella: string | null }>(
      `SELECT id, huella_cierre AS huella
       FROM public.cajas WHERE clave_cierre = $1`,
      [datos.claveCierre],
    );
    if (repetida.rows[0]) {
      if (repetida.rows[0].huella !== huellaCierre) {
        throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
      }
      return repetida.rows[0].id;
    }

    const caja = await cajaAbierta(tx);
    if (!caja) throw new ErrorDeNegocio('CAJA_NO_ABIERTA');
    const movimientos = await tx.query<FilaMovimiento>(
      `SELECT tipo, metodo, monto::text AS monto
       FROM public.caja_movimientos
       WHERE caja_id = $1
       ORDER BY created_at, id`,
      [caja.id],
    );
    const apertura = await tx.query<{ monto: string }>(
      'SELECT monto_apertura::text AS monto FROM public.cajas WHERE id = $1',
      [caja.id],
    );
    const montoEsperado = calcularEfectivoEsperado(
      importe(apertura.rows[0]?.monto ?? null, 'apertura'),
      movimientos.rows.map((movimiento) => ({
        ...movimiento,
        monto: importe(movimiento.monto, 'movimiento de caja'),
      })),
    );
    const actualizada = await tx.query<Identificador>(
      `UPDATE public.cajas
       SET estado = 'CERRADA', monto_esperado = $1, monto_contado = $2,
          diferencia = $2::bigint - $1::bigint, cerrada_por = $3, cerrada_en = NOW(),
           observacion_cierre = $4, clave_cierre = $5, huella_cierre = $6
       WHERE id = $7 AND estado = 'ABIERTA'
       RETURNING id`,
      [
        montoEsperado,
        datos.montoContado,
        usuarioId,
        datos.observacion ?? null,
        datos.claveCierre,
        huellaCierre,
        caja.id,
      ],
    );
    const id = actualizada.rows[0]?.id;
    if (!id) throw new ErrorDeNegocio('CAJA_CERRADA');
    return id;
  });
  const filas = await consultar<FilaCaja>(
    `SELECT ${columnasCaja} FROM public.cajas WHERE id = $1`,
    [cajaId],
  );
  if (!filas[0]) throw new Error('No se pudo consultar la caja cerrada.');
  return mapearCaja(filas[0]);
}

export async function listarProveedores(consulta: string | undefined, rol: Rol) {
  validarRolDueno(rol);
  const valores = consulta?.trim() ? [`%${consulta.trim()}%`] : [];
  const filas = await consultar<FilaContacto>(
    `SELECT id, nombre, identificacion, contacto, telefono, correo, direccion,
            observaciones, activo, created_at::text AS "createdAt",
            updated_at::text AS "updatedAt"
     FROM public.proveedores
     ${valores.length ? 'WHERE nombre ILIKE $1 OR identificacion ILIKE $1' : ''}
     ORDER BY activo DESC, nombre
     LIMIT 200`,
    valores,
  );
  return filas;
}

export async function obtenerProveedor(id: string, rol: Rol) {
  validarRolDueno(rol);
  const filas = await consultar<FilaContacto>(
    `SELECT id, nombre, identificacion, contacto, telefono, correo, direccion,
            observaciones, activo, created_at::text AS "createdAt",
            updated_at::text AS "updatedAt"
     FROM public.proveedores WHERE id = $1`,
    [id],
  );
  if (!filas[0]) throw new ErrorDeNegocio('PROVEEDOR_NO_ENCONTRADO');
  return filas[0];
}

export async function guardarProveedor(
  datos: {
    nombre: string;
    identificacion?: string | undefined;
    contacto?: string | undefined;
    telefono?: string | undefined;
    correo?: string | undefined;
    direccion?: string | undefined;
    observaciones?: string | undefined;
  },
  usuarioId: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  try {
    const resultado = await consultar<FilaContacto>(
      `INSERT INTO public.proveedores
         (nombre, identificacion, contacto, telefono, correo, direccion, observaciones, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nombre, identificacion, contacto, telefono, correo, direccion,
                 observaciones, activo, created_at::text AS "createdAt",
                 updated_at::text AS "updatedAt"`,
      [
        datos.nombre.trim(),
        datos.identificacion?.trim() || null,
        datos.contacto?.trim() || null,
        datos.telefono?.trim() || null,
        datos.correo?.trim() || null,
        datos.direccion?.trim() || null,
        datos.observaciones?.trim() || null,
        usuarioId,
      ],
    );
    if (!resultado[0]) throw new Error('No se pudo crear el proveedor.');
    return resultado[0];
  } catch (error) {
    trasladarDuplicadoContacto(error, 'proveedor');
  }
}

export async function actualizarProveedor(
  id: string,
  cambios: Record<string, string | boolean | undefined>,
  rol: Rol,
) {
  validarRolDueno(rol);
  const columnas: Record<string, string> = {
    nombre: 'nombre',
    identificacion: 'identificacion',
    contacto: 'contacto',
    telefono: 'telefono',
    correo: 'correo',
    direccion: 'direccion',
    observaciones: 'observaciones',
    activo: 'activo',
  };
  const asignaciones: string[] = [];
  const valores: Array<string | boolean | null> = [];
  for (const [campo, columna] of Object.entries(columnas)) {
    const valor = cambios[campo];
    if (valor === undefined) continue;
    valores.push(typeof valor === 'string' ? valor.trim() || null : valor);
    asignaciones.push(`${columna} = $${valores.length}`);
  }
  if (!asignaciones.length) throw new ErrorDeNegocio('DATOS_INVALIDOS');
  valores.push(id);
  try {
    const filas = await consultar<FilaContacto>(
      `UPDATE public.proveedores SET ${asignaciones.join(', ')}
       WHERE id = $${valores.length}
       RETURNING id, nombre, identificacion, contacto, telefono, correo, direccion,
                 observaciones, activo, created_at::text AS "createdAt",
                 updated_at::text AS "updatedAt"`,
      valores,
    );
    if (!filas[0]) throw new ErrorDeNegocio('DATOS_INVALIDOS');
    return filas[0];
  } catch (error) {
    trasladarDuplicadoContacto(error, 'proveedor');
  }
}

export async function listarClientes(consulta: string | undefined, rol: Rol) {
  validarRolDueno(rol);
  const valores = consulta?.trim() ? [`%${consulta.trim()}%`] : [];
  return consultar<FilaContacto & { saldoPendiente: string }>(
    `SELECT c.id, c.nombre, c.identificacion, NULL::text AS contacto, c.telefono,
            c.correo, c.direccion, c.observaciones, c.activo,
            c.created_at::text AS "createdAt", c.updated_at::text AS "updatedAt",
            COALESCE(sum(GREATEST(v.precio_venta::numeric * v.cantidad
              - COALESCE(pagos.total, 0) - COALESCE(abonos.total, 0), 0)), 0)::text
              AS "saldoPendiente"
     FROM public.clientes c
     LEFT JOIN public.cuentas_por_cobrar cp ON cp.cliente_id = c.id
     LEFT JOIN public.ventas v ON v.id = cp.venta_id
     LEFT JOIN LATERAL (
       SELECT sum(monto)::numeric AS total FROM public.pagos_venta WHERE venta_id = v.id
     ) pagos ON true
     LEFT JOIN LATERAL (
       SELECT sum(a.monto)::numeric AS total
       FROM public.abonos a WHERE a.cuenta_id = cp.id
     ) abonos ON true
     ${valores.length ? 'WHERE c.nombre ILIKE $1 OR c.identificacion ILIKE $1' : ''}
     GROUP BY c.id
     ORDER BY c.activo DESC, c.nombre
     LIMIT 200`,
    valores,
  ).then((filas) =>
    filas.map((fila) => ({
      ...fila,
      saldoPendiente: importe(fila.saldoPendiente, 'saldo pendiente'),
    })),
  );
}

export async function obtenerDetalleCliente(id: string, rol: Rol, hoy: string) {
  validarRolDueno(rol);
  const [clientes, ventas] = await Promise.all([
    consultar<FilaContacto>(
      `SELECT id, nombre, identificacion, NULL::text AS contacto, telefono, correo,
              direccion, observaciones, activo, created_at::text AS "createdAt",
              updated_at::text AS "updatedAt"
       FROM public.clientes WHERE id = $1`,
      [id],
    ),
    consultar<{
      id: number;
      referencia: string;
      talla: string;
      cantidad: number;
      total: string;
      fechaVenta: string;
      pagos: string;
      abonos: string;
      saldo: string;
      fechaVencimiento: string | null;
    }>(
      `SELECT v.id, v.referencia, v.talla, v.cantidad,
              (v.precio_venta::numeric * v.cantidad)::text AS total,
              v.fecha_venta::text AS "fechaVenta",
              COALESCE(pagos.total, 0)::text AS pagos,
              COALESCE(abonos.total, 0)::text AS abonos,
              GREATEST(v.precio_venta::numeric * v.cantidad
                - COALESCE(pagos.total, 0) - COALESCE(abonos.total, 0), 0)::text AS saldo,
              cp.fecha_vencimiento::text AS "fechaVencimiento"
       FROM public.ventas v
       LEFT JOIN public.cuentas_por_cobrar cp ON cp.venta_id = v.id
       LEFT JOIN LATERAL (
         SELECT sum(monto)::numeric AS total FROM public.pagos_venta WHERE venta_id = v.id
       ) pagos ON true
       LEFT JOIN LATERAL (
         SELECT sum(a.monto)::numeric AS total FROM public.abonos a WHERE a.cuenta_id = cp.id
       ) abonos ON true
       WHERE v.cliente_id = $1
       ORDER BY v.fecha_venta DESC, v.id DESC`,
      [id],
    ),
  ]);
  const cliente = clientes[0];
  if (!cliente) throw new ErrorDeNegocio('CLIENTE_NO_ENCONTRADO');
  return {
    cliente,
    ventas: ventas.map((venta) => {
      const total = importe(venta.total, 'total de venta');
      const saldo = importe(venta.saldo, 'saldo de venta');
      const pagadoBigInt = BigInt(venta.pagos) + BigInt(venta.abonos);
      if (pagadoBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new RangeError('El total pagado superó el rango seguro de enteros.');
      }
      return {
        id: venta.id,
        referencia: venta.referencia,
        talla: venta.talla,
        cantidad: venta.cantidad,
        total,
        fechaVenta: venta.fechaVenta,
        pagado: Number(pagadoBigInt),
        saldo,
        fechaVencimiento: venta.fechaVencimiento,
        estado:
          saldo === 0
            ? 'PAGADA'
            : venta.fechaVencimiento && venta.fechaVencimiento < hoy
              ? 'VENCIDA'
              : 'PENDIENTE',
      };
    }),
  };
}

export async function guardarCliente(
  datos: {
    nombre: string;
    identificacion?: string | undefined;
    telefono?: string | undefined;
    correo?: string | undefined;
    direccion?: string | undefined;
    observaciones?: string | undefined;
  },
  usuarioId: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  try {
    const filas = await consultar<FilaContacto>(
      `INSERT INTO public.clientes
         (nombre, identificacion, telefono, correo, direccion, observaciones, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, identificacion, NULL::text AS contacto, telefono, correo,
                 direccion, observaciones, activo, created_at::text AS "createdAt",
                 updated_at::text AS "updatedAt"`,
      [
        datos.nombre.trim(),
        datos.identificacion?.trim() || null,
        datos.telefono?.trim() || null,
        datos.correo?.trim() || null,
        datos.direccion?.trim() || null,
        datos.observaciones?.trim() || null,
        usuarioId,
      ],
    );
    if (!filas[0]) throw new Error('No se pudo crear el cliente.');
    return filas[0];
  } catch (error) {
    trasladarDuplicadoContacto(error, 'cliente');
  }
}

export async function actualizarCliente(
  id: string,
  cambios: Record<string, string | boolean | undefined>,
  rol: Rol,
) {
  validarRolDueno(rol);
  const columnas: Record<string, string> = {
    nombre: 'nombre',
    identificacion: 'identificacion',
    telefono: 'telefono',
    correo: 'correo',
    direccion: 'direccion',
    observaciones: 'observaciones',
    activo: 'activo',
  };
  const asignaciones: string[] = [];
  const valores: Array<string | boolean | null> = [];
  for (const [campo, columna] of Object.entries(columnas)) {
    const valor = cambios[campo];
    if (valor === undefined) continue;
    valores.push(typeof valor === 'string' ? valor.trim() || null : valor);
    asignaciones.push(`${columna} = $${valores.length}`);
  }
  if (!asignaciones.length) throw new ErrorDeNegocio('DATOS_INVALIDOS');
  valores.push(id);
  try {
    const filas = await consultar<FilaContacto>(
      `UPDATE public.clientes SET ${asignaciones.join(', ')}
       WHERE id = $${valores.length}
       RETURNING id, nombre, identificacion, NULL::text AS contacto, telefono, correo,
                 direccion, observaciones, activo, created_at::text AS "createdAt",
                 updated_at::text AS "updatedAt"`,
      valores,
    );
    if (!filas[0]) throw new ErrorDeNegocio('CLIENTE_NO_ENCONTRADO');
    return filas[0];
  } catch (error) {
    trasladarDuplicadoContacto(error, 'cliente');
  }
}

export async function listarCuentasPorCobrar(
  filtros: {
    clienteId?: string | undefined;
    estado: string;
    desde?: string | undefined;
    hasta?: string | undefined;
  },
  hoy: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  const valores: unknown[] = [hoy];
  const condiciones: string[] = [];
  if (filtros.clienteId) {
    valores.push(filtros.clienteId);
    condiciones.push(`cp.cliente_id = $${valores.length}`);
  }
  if (filtros.desde) {
    valores.push(filtros.desde);
    condiciones.push(`saldo.fecha_venta >= $${valores.length}::date`);
  }
  if (filtros.hasta) {
    valores.push(filtros.hasta);
    condiciones.push(`saldo.fecha_venta <= $${valores.length}::date`);
  }
  if (filtros.estado === 'VENCIDA') {
    condiciones.push(`cp.fecha_vencimiento < $1::date AND saldo.saldo > 0`);
  } else if (filtros.estado === 'PENDIENTE') {
    condiciones.push(`saldo.abonado = 0 AND saldo.saldo > 0`);
  } else if (filtros.estado === 'ABONO_PARCIAL') {
    condiciones.push(`saldo.abonado > 0 AND saldo.saldo > 0`);
  }
  const filas = await consultar<{
    id: string;
    ventaId: number;
    clienteId: string;
    cliente: string;
    referencia: string;
    talla: string;
    fechaVenta: string;
    fechaVencimiento: string | null;
    total: string;
    abonado: string;
    saldo: string;
    estado: 'PENDIENTE' | 'ABONO_PARCIAL' | 'VENCIDA' | 'PAGADA';
  }>(
    `WITH saldos AS (
       SELECT cp.id, cp.venta_id, cp.cliente_id, cp.fecha_vencimiento,
              v.referencia, v.talla, v.fecha_venta,
              (v.precio_venta::numeric * v.cantidad)::numeric AS total,
              COALESCE(pagos.total, 0) + COALESCE(abonos.total, 0) AS abonado,
              GREATEST((v.precio_venta::numeric * v.cantidad)
                - COALESCE(pagos.total, 0) - COALESCE(abonos.total, 0), 0) AS saldo
       FROM public.cuentas_por_cobrar cp
       JOIN public.ventas v ON v.id = cp.venta_id
       LEFT JOIN LATERAL (
         SELECT sum(monto)::numeric AS total FROM public.pagos_venta WHERE venta_id = v.id
       ) pagos ON true
       LEFT JOIN LATERAL (
         SELECT sum(monto)::numeric AS total FROM public.abonos WHERE cuenta_id = cp.id
       ) abonos ON true
     )
     SELECT saldo.id, saldo.venta_id AS "ventaId", saldo.cliente_id AS "clienteId",
            c.nombre AS cliente, saldo.referencia, saldo.talla,
            saldo.fecha_venta::text AS "fechaVenta",
            saldo.fecha_vencimiento::text AS "fechaVencimiento",
            saldo.total::text AS total, saldo.abonado::text AS abonado,
            saldo.saldo::text AS saldo,
            CASE WHEN saldo.saldo = 0 THEN 'PAGADA'
                 WHEN saldo.fecha_vencimiento < $1::date THEN 'VENCIDA'
                 WHEN saldo.abonado > 0 THEN 'ABONO_PARCIAL'
                 ELSE 'PENDIENTE' END AS estado
     FROM saldos saldo
     JOIN public.clientes c ON c.id = saldo.cliente_id
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY saldo.fecha_vencimiento NULLS LAST, saldo.fecha_venta, saldo.id`,
    valores,
  );
  return filas.map((fila) => ({
    ...fila,
    total: importe(fila.total, 'total de cuenta'),
    abonado: importe(fila.abonado, 'abonos de cuenta'),
    saldo: importe(fila.saldo, 'saldo de cuenta'),
  }));
}

export async function registrarAbono(
  datos: {
    cuentaId: string;
    monto: number;
    metodo: MetodoPago;
    claveIdempotencia: string;
    observacion?: string | undefined;
  },
  usuarioId: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  const huellaAbono = huella({
    cuentaId: datos.cuentaId,
    monto: datos.monto,
    metodo: datos.metodo,
    observacion: datos.observacion ?? null,
    usuarioId,
  });
  return conTransaccion(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      `abono:${datos.claveIdempotencia}`,
    ]);
    const repetido = await tx.query<{ id: string; huella: string }>(
      `SELECT id, huella_idempotencia AS huella
       FROM public.abonos WHERE clave_idempotencia = $1`,
      [datos.claveIdempotencia],
    );
    if (repetido.rows[0]) {
      if (repetido.rows[0].huella !== huellaAbono) {
        throw new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO');
      }
      return { abonoId: repetido.rows[0].id, repetido: true };
    }

    const cuenta = await tx.query<{
      id: string;
      ventaId: number;
      precio: number;
      cantidad: number;
    }>(
      `SELECT cp.id, v.id AS "ventaId", v.precio_venta AS precio, v.cantidad
       FROM public.cuentas_por_cobrar cp
       JOIN public.ventas v ON v.id = cp.venta_id
       WHERE cp.id = $1
       FOR UPDATE OF cp, v`,
      [datos.cuentaId],
    );
    const filaCuenta = cuenta.rows[0];
    if (!filaCuenta) throw new ErrorDeNegocio('CUENTA_NO_ENCONTRADA');
    const totales = await tx.query<{ pagado: string; abonado: string }>(
      `SELECT
         COALESCE((SELECT sum(monto) FROM public.pagos_venta WHERE venta_id = $1), 0)::text AS pagado,
         COALESCE((SELECT sum(monto) FROM public.abonos WHERE cuenta_id = $2), 0)::text AS abonado`,
      [filaCuenta.ventaId, datos.cuentaId],
    );
    const montoPagado = importe(totales.rows[0]?.pagado ?? 0, 'pagos de venta');
    const montoAbonado = importe(totales.rows[0]?.abonado ?? 0, 'abonos');
    const total = importe(
      BigInt(filaCuenta.precio) * BigInt(filaCuenta.cantidad) <= BigInt(Number.MAX_SAFE_INTEGER)
        ? String(BigInt(filaCuenta.precio) * BigInt(filaCuenta.cantidad))
        : null,
      'venta',
    );
    const saldo = total - montoPagado - montoAbonado;
    if (datos.monto > saldo) throw new ErrorDeNegocio('ABONO_SUPERA_SALDO');

    const caja = await cajaAbierta(tx);
    if (!caja) throw new ErrorDeNegocio('CAJA_NO_ABIERTA');
    const abono = await tx.query<Identificador>(
      `INSERT INTO public.abonos
         (cuenta_id, monto, metodo, clave_idempotencia, huella_idempotencia,
          observacion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        datos.cuentaId,
        datos.monto,
        datos.metodo,
        datos.claveIdempotencia,
        huellaAbono,
        datos.observacion?.trim() || null,
        usuarioId,
      ],
    );
    const abonoId = abono.rows[0]?.id;
    if (!abonoId) throw new Error('La base de datos no devolvió el abono recién registrado.');
    await tx.query(
      `INSERT INTO public.caja_movimientos
         (caja_id, tipo, metodo, monto, concepto, abono_id, creado_por)
       VALUES ($1, 'INGRESO', $2, $3, $4, $5, $6)`,
      [caja.id, datos.metodo, datos.monto, `Abono a cuenta ${datos.cuentaId}`, abonoId, usuarioId],
    );
    return { abonoId, repetido: false, saldoResultante: saldo - datos.monto };
  });
}

export async function listarAbonos(cuentaId: string, rol: Rol) {
  validarRolDueno(rol);
  const filas = await consultar<{
    id: string;
    monto: string;
    metodo: MetodoPago;
    observacion: string | null;
    creadoPor: string | null;
    nombreUsuario: string | null;
    createdAt: string;
  }>(
    `SELECT a.id, a.monto::text AS monto, a.metodo, a.observacion,
            a.creado_por AS "creadoPor", u.nombre AS "nombreUsuario",
            a.created_at::text AS "createdAt"
     FROM public.abonos a
     LEFT JOIN public.usuarios u ON u.id = a.creado_por
     WHERE a.cuenta_id = $1
     ORDER BY a.created_at, a.id`,
    [cuentaId],
  );
  return filas.map((fila) => ({ ...fila, monto: importe(fila.monto, 'abono') }));
}

export async function obtenerDashboardComercial(
  filtros: { desde: string; hasta: string },
  hoy: string,
  rol: Rol,
) {
  validarRolDueno(rol);
  const semanaDesde = new Date(`${hoy}T12:00:00-05:00`);
  semanaDesde.setUTCDate(semanaDesde.getUTCDate() - ((semanaDesde.getUTCDay() + 6) % 7));
  const inicioSemana = fechaBogota(semanaDesde.toISOString());
  const mesDesde = `${hoy.slice(0, 7)}-01`;
  const vencimientoProximo = new Date(`${hoy}T12:00:00-05:00`);
  vencimientoProximo.setUTCDate(vencimientoProximo.getUTCDate() + 7);
  const hastaVencimiento = fechaBogota(vencimientoProximo.toISOString());
  const [
    totales,
    recibido,
    abonos,
    pendientes,
    pagosMetodo,
    serie,
    serieAbonos,
    seriesAgrupadas,
    productos,
    inventario,
    ventasRecientes,
    vencidas,
    serieSemana,
  ] = await Promise.all([
    consultar<{
      vendido: string;
      transacciones: string;
      unidades: string;
      hoy: string;
      semana: string;
      mes: string;
      ventasPagadas: string;
      ventasCredito: string;
      valorVentasPagadas: string;
      valorVentasCredito: string;
      sinClasificar: string;
    }>(
      `SELECT
           COALESCE(sum(precio_venta::numeric * cantidad), 0)::text AS vendido,
           count(*)::text AS transacciones,
           COALESCE(sum(cantidad), 0)::text AS unidades,
           COALESCE((SELECT sum(precio_venta::numeric * cantidad)
             FROM public.ventas WHERE fecha_venta = $3::date), 0)::text AS hoy,
           COALESCE((SELECT sum(precio_venta::numeric * cantidad)
             FROM public.ventas WHERE fecha_venta BETWEEN $4::date AND $3::date), 0)::text AS semana,
           COALESCE((SELECT sum(precio_venta::numeric * cantidad)
             FROM public.ventas WHERE fecha_venta BETWEEN $5::date AND $3::date), 0)::text AS mes,
           count(*) FILTER (WHERE v.pago_registrado AND cp.id IS NULL)::text AS "ventasPagadas",
           count(*) FILTER (WHERE v.pago_registrado AND cp.id IS NOT NULL)::text AS "ventasCredito",
           COALESCE(sum(v.precio_venta::numeric * v.cantidad)
             FILTER (WHERE v.pago_registrado AND cp.id IS NULL), 0)::text AS "valorVentasPagadas",
           COALESCE(sum(v.precio_venta::numeric * v.cantidad)
             FILTER (WHERE v.pago_registrado AND cp.id IS NOT NULL), 0)::text AS "valorVentasCredito",
           count(*) FILTER (WHERE NOT v.pago_registrado)::text AS "sinClasificar"
         FROM public.ventas v
         LEFT JOIN public.cuentas_por_cobrar cp ON cp.venta_id = v.id
         WHERE v.fecha_venta BETWEEN $1::date AND $2::date`,
      [filtros.desde, filtros.hasta, hoy, inicioSemana, mesDesde],
    ),
    consultar<{ total: string }>(
      `SELECT COALESCE(sum(monto), 0)::text AS total
         FROM public.pagos_venta
         WHERE (created_at AT TIME ZONE 'America/Bogota')::date
           BETWEEN $1::date AND $2::date`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ total: string }>(
      `SELECT COALESCE(sum(monto), 0)::text AS total
         FROM public.abonos
         WHERE (created_at AT TIME ZONE 'America/Bogota')::date
           BETWEEN $1::date AND $2::date`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ saldo: string; clientes: string }>(
      `WITH saldo AS (
           SELECT cp.cliente_id,
             GREATEST(v.precio_venta::numeric * v.cantidad
               - COALESCE(p.total, 0) - COALESCE(a.total, 0), 0) AS saldo
           FROM public.cuentas_por_cobrar cp
           JOIN public.ventas v ON v.id = cp.venta_id
           LEFT JOIN LATERAL (
             SELECT sum(monto)::numeric AS total FROM public.pagos_venta WHERE venta_id = v.id
           ) p ON true
           LEFT JOIN LATERAL (
             SELECT sum(monto)::numeric AS total FROM public.abonos WHERE cuenta_id = cp.id
           ) a ON true
         )
         SELECT COALESCE(sum(saldo), 0)::text AS saldo,
                count(DISTINCT cliente_id) FILTER (WHERE saldo > 0)::text AS clientes
         FROM saldo`,
    ),
    consultar<{ metodo: MetodoPago; total: string }>(
      `SELECT metodo, sum(monto)::text AS total
         FROM (
           SELECT metodo, monto FROM public.pagos_venta
           WHERE (created_at AT TIME ZONE 'America/Bogota')::date
             BETWEEN $1::date AND $2::date
           UNION ALL
           SELECT metodo, monto FROM public.abonos
           WHERE (created_at AT TIME ZONE 'America/Bogota')::date
             BETWEEN $1::date AND $2::date
         ) pagos
         GROUP BY metodo ORDER BY metodo`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ fecha: string; vendido: string }>(
      `WITH calendario AS (
           SELECT generate_series($1::date, $2::date, interval '1 day')::date AS fecha
         ), ventas_periodo AS (
           SELECT fecha_venta, sum(precio_venta::numeric * cantidad) AS total
           FROM public.ventas WHERE fecha_venta BETWEEN $1::date AND $2::date
           GROUP BY fecha_venta
         )
         SELECT calendario.fecha::text AS fecha, COALESCE(ventas_periodo.total, 0)::text AS vendido
         FROM calendario LEFT JOIN ventas_periodo ON ventas_periodo.fecha_venta = calendario.fecha
         ORDER BY calendario.fecha`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ fecha: string; monto: string }>(
      `SELECT (created_at AT TIME ZONE 'America/Bogota')::date::text AS fecha,
                sum(monto)::text AS monto
         FROM public.abonos
         WHERE (created_at AT TIME ZONE 'America/Bogota')::date
           BETWEEN $1::date AND $2::date
         GROUP BY (created_at AT TIME ZONE 'America/Bogota')::date
         ORDER BY fecha`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ periodo: 'SEMANA' | 'MES'; fecha: string; vendido: string }>(
      `SELECT 'SEMANA' AS periodo,
                date_trunc('week', fecha_venta::timestamp)::date::text AS fecha,
                sum(precio_venta::numeric * cantidad)::text AS vendido
         FROM public.ventas
         WHERE fecha_venta BETWEEN $1::date AND $2::date
         GROUP BY date_trunc('week', fecha_venta::timestamp)::date
         UNION ALL
         SELECT 'MES' AS periodo,
                date_trunc('month', fecha_venta::timestamp)::date::text AS fecha,
                sum(precio_venta::numeric * cantidad)::text AS vendido
         FROM public.ventas
         WHERE fecha_venta BETWEEN $1::date AND $2::date
         GROUP BY date_trunc('month', fecha_venta::timestamp)::date
         ORDER BY periodo, fecha`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ referencia: string; talla: string; unidades: string; vendido: string }>(
      `SELECT referencia, talla, sum(cantidad)::text AS unidades,
                sum(precio_venta::numeric * cantidad)::text AS vendido
         FROM public.ventas
         WHERE fecha_venta BETWEEN $1::date AND $2::date
         GROUP BY referencia, talla
         ORDER BY sum(cantidad) DESC, referencia, talla
         LIMIT 10`,
      [filtros.desde, filtros.hasta],
    ),
    consultar<{ agotados: string; stockBajo: string }>(
      `SELECT count(*) FILTER (WHERE cantidad = 0)::text AS agotados,
                count(*) FILTER (WHERE cantidad > 0 AND cantidad <= stock_minimo)::text AS "stockBajo"
         FROM public.productos WHERE activo = true`,
    ),
    consultar<{
      id: number;
      referencia: string;
      talla: string;
      cantidad: number;
      precioUnitario: string;
      total: string;
      fechaVenta: string;
      nombreUsuario: string;
    }>(
      `SELECT v.id, v.referencia, v.talla, v.cantidad,
                v.precio_venta::text AS "precioUnitario",
                (v.precio_venta::numeric * v.cantidad)::text AS total,
                v.fecha_venta::text AS "fechaVenta",
                COALESCE(NULLIF(BTRIM(u.nombre), ''), u.usuario, 'Sin usuario') AS "nombreUsuario"
         FROM public.ventas v
         LEFT JOIN public.usuarios u ON u.id = v.usuario_id
         ORDER BY v.fecha_venta DESC, v.id DESC LIMIT 10`,
    ),
    consultar<{
      id: string;
      cliente: string;
      saldo: string;
      vencimiento: string | null;
    }>(
      `SELECT cp.id, c.nombre AS cliente,
                GREATEST(v.precio_venta::numeric * v.cantidad
                  - COALESCE(p.total, 0) - COALESCE(a.total, 0), 0)::text AS saldo,
                cp.fecha_vencimiento::text AS vencimiento
         FROM public.cuentas_por_cobrar cp
         JOIN public.clientes c ON c.id = cp.cliente_id
         JOIN public.ventas v ON v.id = cp.venta_id
         LEFT JOIN LATERAL (
           SELECT sum(monto)::numeric AS total FROM public.pagos_venta WHERE venta_id = v.id
         ) p ON true
         LEFT JOIN LATERAL (
           SELECT sum(monto)::numeric AS total FROM public.abonos WHERE cuenta_id = cp.id
         ) a ON true
         WHERE cp.fecha_vencimiento BETWEEN $1::date AND $2::date
           AND v.precio_venta::numeric * v.cantidad
             - COALESCE(p.total, 0) - COALESCE(a.total, 0) > 0
         ORDER BY cp.fecha_vencimiento, cp.id LIMIT 10`,
      [hoy, hastaVencimiento],
    ),
    consultar<{ fecha: string; vendido: string; transacciones: string }>(
      `WITH calendario AS (
           SELECT (date_trunc('week', $1::date::timestamp)::date + dias.dia) AS fecha
           FROM generate_series(0, 6) AS dias(dia)
         ), ventas_periodo AS (
           SELECT fecha_venta,
                  sum(precio_venta::numeric * cantidad)::text AS vendido,
                  count(*)::text AS transacciones
           FROM public.ventas
           WHERE fecha_venta BETWEEN date_trunc('week', $1::date::timestamp)::date
             AND date_trunc('week', $1::date::timestamp)::date + 6
           GROUP BY fecha_venta
         )
         SELECT calendario.fecha::text AS fecha,
                COALESCE(ventas_periodo.vendido, '0') AS vendido,
                COALESCE(ventas_periodo.transacciones, '0') AS transacciones
         FROM calendario
         LEFT JOIN ventas_periodo ON ventas_periodo.fecha_venta = calendario.fecha
         ORDER BY calendario.fecha`,
      [hoy],
    ),
  ]);
  const total = totales[0];
  const deuda = pendientes[0];
  const existencia = inventario[0];
  if (!total || !deuda || !existencia)
    throw new Error('No se pudo calcular el dashboard comercial.');
  const ventasNumericas = importe(total.vendido, 'ventas');
  const transacciones = importe(total.transacciones, 'ventas');
  return {
    filtros,
    vendido: ventasNumericas,
    transacciones,
    promedioVenta: transacciones === 0 ? null : Math.round(ventasNumericas / transacciones),
    unidades: importe(total.unidades, 'unidades vendidas'),
    vendidoHoy: importe(total.hoy, 'ventas de hoy'),
    vendidoSemana: importe(total.semana, 'ventas de la semana'),
    vendidoMes: importe(total.mes, 'ventas del mes'),
    ventasPagadas: importe(total.ventasPagadas, 'ventas pagadas'),
    ventasCredito: importe(total.ventasCredito, 'ventas a crédito'),
    valorVentasPagadas: importe(total.valorVentasPagadas, 'valor de ventas pagadas'),
    valorVentasCredito: importe(total.valorVentasCredito, 'valor de ventas a crédito'),
    pagosHistoricosSinClasificar: importe(total.sinClasificar, 'ventas sin clasificar'),
    pagosRecibidos: importe(
      (BigInt(recibido[0]?.total ?? 0) + BigInt(abonos[0]?.total ?? 0)).toString(),
      'pagos y abonos recibidos',
    ),
    abonosRecibidos: importe(abonos[0]?.total ?? 0, 'abonos recibidos'),
    saldoPendiente: importe(deuda.saldo, 'saldo pendiente'),
    clientesConSaldo: importe(deuda.clientes, 'clientes con saldo'),
    pagosPorMetodo: pagosMetodo.map((fila) => ({
      metodo: fila.metodo,
      monto: importe(fila.total, 'pago por método'),
    })),
    serie: serie.map((fila) => ({
      fecha: fila.fecha,
      vendido: importe(fila.vendido, 'ventas por día'),
    })),
    serieSemana: serieSemana.map((fila) => ({
      fecha: fila.fecha,
      vendido: importe(fila.vendido, 'ventas de la semana por día'),
      transacciones: importe(fila.transacciones, 'ventas registradas por día de la semana'),
    })),
    serieAbonos: serieAbonos.map((fila) => ({
      fecha: fila.fecha,
      monto: importe(fila.monto, 'abonos por día'),
    })),
    seriesAgrupadas: seriesAgrupadas.map((fila) => ({
      periodo: fila.periodo,
      fecha: fila.fecha,
      vendido: importe(fila.vendido, 'ventas agrupadas'),
    })),
    productosMasVendidos: productos.map((fila) => ({
      ...fila,
      unidades: importe(fila.unidades, 'unidades por producto'),
      vendido: importe(fila.vendido, 'ventas por producto'),
    })),
    stockAgotado: importe(existencia.agotados, 'productos agotados'),
    stockBajo: importe(existencia.stockBajo, 'productos con stock bajo'),
    ventasRecientes: ventasRecientes.map((venta) => ({
      ...venta,
      precioUnitario: importe(venta.precioUnitario, 'precio unitario de venta reciente'),
      total: importe(venta.total, 'venta reciente'),
    })),
    cuentasPorVencer: vencidas.map((fila) => ({
      ...fila,
      saldo: importe(fila.saldo, 'saldo por vencer'),
    })),
  };
}
