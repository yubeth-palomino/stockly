import { ErrorDeNegocio } from '@/lib/reglas/errores';

export const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export type PagoVentaValidado = { metodo: MetodoPago; monto: number };

export function validarPagosVenta(
  total: number,
  pagos: PagoVentaValidado[],
  esCredito: boolean,
): { totalPagado: number; saldoPendiente: number } {
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }

  const totalPagado = pagos.reduce((suma, pago) => {
    if (!Number.isSafeInteger(pago.monto) || pago.monto <= 0) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS');
    }
    return suma + pago.monto;
  }, 0);

  if (!Number.isSafeInteger(totalPagado) || totalPagado > total) {
    throw new ErrorDeNegocio('PAGO_VENTA_NO_COINCIDE');
  }
  if (!esCredito && totalPagado !== total) {
    throw new ErrorDeNegocio('PAGO_VENTA_NO_COINCIDE');
  }
  if (esCredito && totalPagado === total) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }

  return { totalPagado, saldoPendiente: total - totalPagado };
}

export function calcularEfectivoEsperado(
  apertura: number,
  movimientos: Array<{ tipo: 'INGRESO' | 'EGRESO'; metodo: MetodoPago; monto: number }>,
): number {
  if (!Number.isSafeInteger(apertura) || apertura < 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  let efectivo = BigInt(apertura);
  for (const movimiento of movimientos) {
    if (!Number.isSafeInteger(movimiento.monto) || movimiento.monto <= 0) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS');
    }
    if (movimiento.metodo !== 'EFECTIVO') continue;
    efectivo += BigInt(movimiento.monto) * (movimiento.tipo === 'INGRESO' ? 1n : -1n);
  }
  if (efectivo < 0n || efectivo > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  return Number(efectivo);
}

export function calcularSaldoPendiente(totalVenta: number, pagos: number[]): number {
  if (!Number.isSafeInteger(totalVenta) || totalVenta <= 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  const pagado = pagos.reduce((suma, monto) => {
    if (!Number.isSafeInteger(monto) || monto <= 0) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS');
    }
    return suma + monto;
  }, 0);
  if (!Number.isSafeInteger(pagado) || pagado > totalVenta) {
    throw new ErrorDeNegocio('ABONO_SUPERA_SALDO');
  }
  return totalVenta - pagado;
}
