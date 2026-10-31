import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esFechaFutura, esFechaValida } from '@/lib/reglas/fechas';

export function normalizarReferencia(referencia: string): string {
  return referencia.trim().toUpperCase();
}

export function normalizarTalla(talla: string): string {
  return talla.trim().toUpperCase();
}

export function clave(referencia: string, talla: string): string {
  return `${normalizarReferencia(referencia)}|${normalizarTalla(talla)}`;
}

export function calcularDisponible(cantidad: number): boolean {
  return cantidad > 0;
}

export function validarEntrada(d: {
  referencia: string;
  marca: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
  fechaEntrada: string;
  hoy: string;
}): void {
  if (
    !d.referencia.trim() ||
    !d.marca.trim() ||
    !d.descripcion.trim() ||
    !d.talla.trim()
  ) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (!Number.isInteger(d.cantidad) || d.cantidad <= 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (!Number.isInteger(d.precioVenta) || d.precioVenta <= 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (!esFechaValida(d.fechaEntrada)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (esFechaFutura(d.fechaEntrada, d.hoy)) {
    throw new ErrorDeNegocio('FECHA_FUTURA');
  }
}
