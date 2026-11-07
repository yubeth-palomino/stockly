import { ErrorDeNegocio } from '@/lib/reglas/errores';

const CANTIDAD_MAXIMA = 2_147_483_647;

export function normalizarReferenciaComercial(referencia: string): string {
  return referencia.trim().replace(/\s+/g, '').toUpperCase();
}

export function normalizarTallaComercial(talla: string): string {
  return talla.trim().replace(/\s+/g, '').toUpperCase();
}

export function normalizarColor(color: string | null | undefined): string | null {
  const normalizado = color?.trim().replace(/\s+/g, ' ').toUpperCase();
  return normalizado || null;
}

export function normalizarCodigoComercial(codigo: string | null | undefined): string | null {
  const normalizado = codigo?.trim().replace(/\s+/g, '').toUpperCase();
  return normalizado || null;
}

export function claveVariante(
  referencia: string,
  talla: string,
  color?: string | null,
): string {
  return [
    normalizarReferenciaComercial(referencia),
    normalizarTallaComercial(talla),
    normalizarColor(color) ?? '',
  ].join('|');
}

export function calcularCantidadAjustada(cantidadActual: number, delta: number): number {
  if (
    !Number.isSafeInteger(cantidadActual) ||
    cantidadActual < 0 ||
    !Number.isSafeInteger(delta) ||
    delta === 0
  ) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }

  const nuevaCantidad = cantidadActual + delta;
  if (nuevaCantidad < 0) throw new ErrorDeNegocio('STOCK_INSUFICIENTE');
  if (!Number.isSafeInteger(nuevaCantidad) || nuevaCantidad > CANTIDAD_MAXIMA) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  return nuevaCantidad;
}

export function calcularCostoPromedioPonderado(datos: {
  cantidadActual: number;
  costoPromedioActual: number | null;
  costoPromedioValidado: boolean;
  cantidadEntrada: number;
  costoUnitarioEntrada: number;
}): number {
  const {
    cantidadActual,
    costoPromedioActual,
    costoPromedioValidado,
    cantidadEntrada,
    costoUnitarioEntrada,
  } = datos;
  if (
    !Number.isSafeInteger(cantidadActual) ||
    cantidadActual < 0 ||
    cantidadActual > CANTIDAD_MAXIMA ||
    typeof costoPromedioValidado !== 'boolean' ||
    !Number.isSafeInteger(cantidadEntrada) ||
    cantidadEntrada <= 0 ||
    !Number.isSafeInteger(costoUnitarioEntrada) ||
    costoUnitarioEntrada <= 0 ||
    (costoPromedioActual !== null &&
      (!Number.isSafeInteger(costoPromedioActual) || costoPromedioActual <= 0))
  ) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }

  if (cantidadActual === 0) return costoUnitarioEntrada;
  if (!costoPromedioValidado || costoPromedioActual === null) {
    throw new ErrorDeNegocio('COSTO_PROMEDIO_NO_REGISTRADO');
  }

  const cantidadTotal = cantidadActual + cantidadEntrada;
  if (cantidadTotal > CANTIDAD_MAXIMA) throw new ErrorDeNegocio('DATOS_INVALIDOS');

  const costoPonderado =
    BigInt(cantidadActual) * BigInt(costoPromedioActual) +
    BigInt(cantidadEntrada) * BigInt(costoUnitarioEntrada);
  const costoRedondeado = (costoPonderado + BigInt(cantidadTotal) / 2n) / BigInt(cantidadTotal);
  if (costoRedondeado > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('El costo promedio supera el rango seguro de enteros.');
  }
  return Number(costoRedondeado);
}
