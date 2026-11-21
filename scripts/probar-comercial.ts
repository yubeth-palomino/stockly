import { randomUUID } from 'node:crypto';
import {
  abrirCaja,
  cerrarCaja,
  obtenerCajaActual,
  obtenerDashboardComercial,
  obtenerDetalleCliente,
  registrarAbono,
  registrarMovimientoCaja,
} from '@/lib/datos/operacionesComerciales';
import { registrarVentaConPago } from '@/lib/datos/ventas';
import { cerrarPool } from '@/lib/datos/conexion';
import { conTransaccion, consultar } from '@/lib/db/conexion';
import { hoyBogota } from '@/lib/reglas/fechas';
import type { DatosVentaComercial } from '@/lib/datos/tipos';

if (process.env.STOCKLY_PRUEBA_COMERCIAL !== 'SI') {
  throw new Error('Para ejecutar esta prueba, define STOCKLY_PRUEBA_COMERCIAL=SI explícitamente.');
}

const referencia = `PRUEBA-COM-${Date.now()}`;
const nombreCliente = `Prueba comercial ${randomUUID()}`;
const clavesCaja = [randomUUID(), randomUUID()];
let clienteId: string | null = null;
let empresaId: string | null = null;
let totalFallos = 0;

function comprobar(nombre: string, correcto: boolean, detalle = '') {
  console.log(`${correcto ? 'OK' : 'FALLA'} ${nombre}${detalle ? `: ${detalle}` : ''}`);
  if (!correcto) totalFallos += 1;
}

async function limpiarDatosDePrueba() {
  if (!empresaId) return;
  await conTransaccion(async (tx) => {
    await tx.query(
      `DELETE FROM public.caja_movimientos
       WHERE caja_id IN (
         SELECT id FROM public.cajas
         WHERE empresa_id = $2 AND clave_apertura = ANY($1::uuid[])
       )`,
      [clavesCaja, empresaId],
    );
    await tx.query(
      `DELETE FROM public.abonos
       WHERE cuenta_id IN (
         SELECT cp.id FROM public.cuentas_por_cobrar cp
         JOIN public.ventas v ON v.id = cp.venta_id
         WHERE v.empresa_id = $2 AND v.referencia = $1
       )`,
      [referencia, empresaId],
    );
    await tx.query(
      `DELETE FROM public.cuentas_por_cobrar
       WHERE venta_id IN (
         SELECT id FROM public.ventas WHERE empresa_id = $2 AND referencia = $1
       )`,
      [referencia, empresaId],
    );
    await tx.query(
      `DELETE FROM public.pagos_venta
       WHERE venta_id IN (
         SELECT id FROM public.ventas WHERE empresa_id = $2 AND referencia = $1
       )`,
      [referencia, empresaId],
    );
    await tx.query(
      'DELETE FROM public.ventas WHERE empresa_id = $2 AND referencia = $1',
      [referencia, empresaId],
    );
    await tx.query(
      `DELETE FROM public.eventos_inventario
       WHERE producto_id IN (
         SELECT id FROM public.productos WHERE empresa_id = $2 AND referencia = $1
       )`,
      [referencia, empresaId],
    );
    await tx.query(
      'DELETE FROM public.cajas WHERE empresa_id = $2 AND clave_apertura = ANY($1::uuid[])',
      [clavesCaja, empresaId],
    );
    if (clienteId) {
      await tx.query(
        'DELETE FROM public.clientes WHERE id = $1 AND empresa_id = $2',
        [clienteId, empresaId],
      );
    } else {
      await tx.query(
        'DELETE FROM public.clientes WHERE nombre = $1 AND empresa_id = $2',
        [nombreCliente, empresaId],
      );
    }
    await tx.query(
      'DELETE FROM public.productos WHERE referencia = $1 AND empresa_id = $2',
      [referencia, empresaId],
    );
  });
}

async function main() {
  const propietarios = await consultar<{ id: string; empresa_id: string }>(
    `SELECT id, empresa_id FROM public.usuarios WHERE rol = 'dueno' AND activo = true
     ORDER BY created_at, id LIMIT 1`,
  );
  const propietario = propietarios[0];
  if (!propietario) throw new Error('No hay un dueño activo para la prueba comercial.');
  empresaId = propietario.empresa_id;
  const empresa = propietario.empresa_id;
  const cajasAbiertas = await consultar<{ id: string }>(
    `SELECT id FROM public.cajas
     WHERE empresa_id = $1 AND estado = 'ABIERTA' LIMIT 1`,
    [empresa],
  );
  if (cajasAbiertas.length) {
    throw new Error('La prueba se detiene porque ya existe una caja abierta.');
  }
  const hoy = hoyBogota();
  const dashboardAntes = await obtenerDashboardComercial(
    { desde: hoy, hasta: hoy },
    hoy,
    'dueno',
    empresa,
  );

  await consultar(
    `INSERT INTO public.productos
       (referencia, marca, descripcion, talla, cantidad, precio_venta, fecha_entrada, empresa_id)
     VALUES ($1, 'PRUEBA', 'Producto temporal', 'M', 5, 50000, $2, $3)`,
    [referencia, hoy, empresa],
  );
  const clientes = await consultar<{ id: string }>(
    `INSERT INTO public.clientes (nombre, creado_por, empresa_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [nombreCliente, propietario.id, empresa],
  );
  clienteId = clientes[0]?.id ?? null;
  if (!clienteId) throw new Error('No se pudo crear el cliente temporal.');

  const aperturas = await Promise.allSettled(
    clavesCaja.map((claveApertura) =>
      abrirCaja({ montoApertura: 100_000, claveApertura }, propietario.id, 'dueno', empresa),
    ),
  );
  const cajaAbierta = aperturas.find(
    (resultado): resultado is PromiseFulfilledResult<Awaited<ReturnType<typeof abrirCaja>>> =>
      resultado.status === 'fulfilled',
  );
  const aperturasRechazadas = aperturas.filter((resultado) => resultado.status === 'rejected');
  comprobar(
    'apertura concurrente crea una sola caja',
    Boolean(cajaAbierta) && aperturasRechazadas.length === 1,
  );
  if (!cajaAbierta || aperturasRechazadas.length !== 1) return;
  comprobar(
    'segunda apertura concurrente se rechaza',
    aperturasRechazadas[0]?.status === 'rejected' &&
      aperturasRechazadas[0].reason?.codigo === 'CAJA_YA_ABIERTA',
  );

  const claveVentaPagada = randomUUID();
  const ventaPagada: DatosVentaComercial = {
    referencia,
    talla: 'M',
    cantidad: 1,
    tipoPago: 'PAGADA',
    pagos: [{ metodo: 'EFECTIVO', monto: 50_000 }],
    claveIdempotencia: claveVentaPagada,
  };
  const ventaRegistrada = await registrarVentaConPago(
    ventaPagada,
    propietario.id,
    'dueno',
    empresa,
  );
  const reintentoVenta = await registrarVentaConPago(
    ventaPagada,
    propietario.id,
    'dueno',
    empresa,
  );
  comprobar('reintento de venta idempotente', !ventaRegistrada.repetida && reintentoVenta.repetida);

  const ventaCredito: DatosVentaComercial = {
    referencia,
    talla: 'M',
    cantidad: 1,
    tipoPago: 'CREDITO',
    pagos: [{ metodo: 'TRANSFERENCIA', monto: 10_000 }],
    clienteId,
    claveIdempotencia: randomUUID(),
  };
  const creditoRegistrado = await registrarVentaConPago(
    ventaCredito,
    propietario.id,
    'dueno',
    empresa,
  );
  comprobar(
    'venta a crédito no cuenta saldo como pago',
    creditoRegistrado.saldoPendiente === 40_000,
  );

  const cuenta = await consultar<{ id: string }>(
    `SELECT id FROM public.cuentas_por_cobrar
     WHERE venta_id = $1 AND empresa_id = $2`,
    [creditoRegistrado.venta.id, empresa],
  );
  const cuentaId = cuenta[0]?.id;
  if (!cuentaId) throw new Error('No se creó la cuenta temporal por cobrar.');

  const clavesAbono = [randomUUID(), randomUUID()];
  const abonosSimultaneos = await Promise.allSettled(
    clavesAbono.map((claveIdempotencia) =>
      registrarAbono(
        { cuentaId, monto: 25_000, metodo: 'EFECTIVO', claveIdempotencia },
        propietario.id,
        'dueno',
        empresa,
      ),
    ),
  );
  const abonoAceptado = abonosSimultaneos.find(
    (resultado): resultado is PromiseFulfilledResult<Awaited<ReturnType<typeof registrarAbono>>> =>
      resultado.status === 'fulfilled',
  );
  const abonosRechazados = abonosSimultaneos.filter((resultado) => resultado.status === 'rejected');
  comprobar(
    'abonos concurrentes no superan el saldo',
    Boolean(abonoAceptado) &&
      abonosRechazados.length === 1 &&
      abonosRechazados[0]?.status === 'rejected' &&
      abonosRechazados[0].reason?.codigo === 'ABONO_SUPERA_SALDO',
  );
  if (!abonoAceptado) return;
  const indiceAbono = abonosSimultaneos.indexOf(abonoAceptado);
  const reintentoAbono = await registrarAbono(
    { cuentaId, monto: 25_000, metodo: 'EFECTIVO', claveIdempotencia: clavesAbono[indiceAbono]! },
    propietario.id,
    'dueno',
    empresa,
  );
  comprobar('reintento de abono idempotente', reintentoAbono.repetido);

  const detalle = await obtenerDetalleCliente(clienteId, 'dueno', hoy, empresa);
  comprobar(
    'detalle del cliente conserva ventas y saldo',
    detalle.ventas.length === 1 && detalle.ventas[0]?.saldo === 15_000,
  );

  let egresoRechazado = false;
  try {
    await registrarMovimientoCaja(
      {
        tipo: 'EGRESO',
        metodo: 'EFECTIVO',
        monto: 175_001,
        concepto: 'Validación temporal',
        claveIdempotencia: randomUUID(),
      },
      propietario.id,
      'dueno',
      empresa,
    );
  } catch (error) {
    egresoRechazado =
      typeof error === 'object' &&
      error !== null &&
      'codigo' in error &&
      error.codigo === 'CAJA_EFECTIVO_INSUFICIENTE';
  }
  comprobar('egreso no supera efectivo disponible', egresoRechazado);

  await registrarAbono(
    { cuentaId, monto: 15_000, metodo: 'TRANSFERENCIA', claveIdempotencia: randomUUID() },
    propietario.id,
    'dueno',
    empresa,
  );
  const cajaActual = await obtenerCajaActual('dueno', empresa);
  comprobar(
    'efectivo esperado separa pagos por transferencia',
    cajaActual?.montoEsperado === 175_000,
  );
  comprobar(
    'caja separa ventas y abonos por medio',
    cajaActual?.ventasRecibidasPorMetodo.find((pago) => pago.metodo === 'EFECTIVO')?.monto ===
      50_000 &&
      cajaActual.abonosRecibidosPorMetodo.find((pago) => pago.metodo === 'EFECTIVO')?.monto ===
        25_000,
  );

  const cierreClave = randomUUID();
  const cierre = await cerrarCaja(
    { montoContado: 175_000, claveCierre: cierreClave },
    propietario.id,
    'dueno',
    empresa,
  );
  const reintentoCierre = await cerrarCaja(
    { montoContado: 175_000, claveCierre: cierreClave },
    propietario.id,
    'dueno',
    empresa,
  );
  comprobar(
    'cierre e idempotencia conservan diferencia cero',
    cierre.diferencia === 0 && reintentoCierre.id === cierre.id,
  );

  const cuentas = await consultar<{ saldo: string }>(
    `SELECT GREATEST(v.precio_venta::numeric * v.cantidad
       - COALESCE(pagos.total, 0) - COALESCE(abonos.total, 0), 0)::text AS saldo
     FROM public.cuentas_por_cobrar cp
     JOIN public.ventas v ON v.id = cp.venta_id
     LEFT JOIN LATERAL (
       SELECT sum(monto)::numeric AS total FROM public.pagos_venta
       WHERE venta_id = v.id AND empresa_id = $2
     ) pagos ON true
     LEFT JOIN LATERAL (
       SELECT sum(monto)::numeric AS total FROM public.abonos
       WHERE cuenta_id = cp.id AND empresa_id = $2
     ) abonos ON true
     WHERE cp.id = $1 AND cp.empresa_id = $2`,
    [cuentaId, empresa],
  );
  comprobar('abono final deja saldo cero', Number(cuentas[0]?.saldo) === 0);
  const dashboardDespues = await obtenerDashboardComercial(
    { desde: hoy, hasta: hoy },
    hoy,
    'dueno',
    empresa,
  );
  comprobar(
    'dashboard suma ventas sin duplicar abonos',
    dashboardDespues.transacciones - dashboardAntes.transacciones === 2 &&
      dashboardDespues.vendido - dashboardAntes.vendido === 100_000 &&
      dashboardDespues.pagosRecibidos - dashboardAntes.pagosRecibidos === 100_000,
  );
  comprobar(
    'dashboard clasifica ventas pagadas y a crédito',
    dashboardDespues.ventasPagadas - dashboardAntes.ventasPagadas === 1 &&
      dashboardDespues.ventasCredito - dashboardAntes.ventasCredito === 1,
  );
}

async function ejecutar() {
  try {
    await main();
  } catch (error) {
    totalFallos += 1;
    console.error('Falló la prueba comercial:', error);
  } finally {
    try {
      await limpiarDatosDePrueba();
    } catch (error) {
      totalFallos += 1;
      console.error('No se pudieron limpiar los datos temporales de prueba:', error);
    }
    await cerrarPool();
    console.log(`Total de fallas: ${totalFallos}`);
    if (totalFallos > 0) process.exitCode = 1;
  }
}

void ejecutar();
