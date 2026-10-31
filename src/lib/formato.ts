import { esFechaValida } from '@/lib/reglas/fechas';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const formatoCantidad = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});
const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function formatearPesos(valor: number): string {
  if (!Number.isInteger(valor)) throw new RangeError('El monto debe expresarse en pesos enteros.');
  return formatoPesos.format(valor);
}

export function formatearFecha(valor: string): string {
  if (!esFechaValida(valor)) throw new RangeError('La fecha debe tener formato YYYY-MM-DD.');
  return formatoFecha.format(new Date(`${valor}T00:00:00.000Z`));
}

export function formatearCantidad(valor: number): string {
  if (!Number.isInteger(valor)) throw new RangeError('La cantidad debe ser un número entero.');
  return formatoCantidad.format(valor);
}
