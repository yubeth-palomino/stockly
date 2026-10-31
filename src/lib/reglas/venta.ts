import { ErrorDeNegocio } from '@/lib/reglas/errores';

export function validarVenta(d: {
  referencia: string;
  talla: string;
  cantidad: number;
}): void {
  if (!d.referencia.trim() || !d.talla.trim()) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (!Number.isInteger(d.cantidad) || d.cantidad <= 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
}

export function cantidadTrasVenta(disponible: number, vendida: number): number {
  if (vendida > disponible) {
    throw new ErrorDeNegocio('STOCK_INSUFICIENTE', undefined, { disponible });
  }
  return disponible - vendida;
}
