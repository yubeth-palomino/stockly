import { ErrorDeNegocio } from '@/lib/reglas/errores';

export function gananciaPorUnidad(precioVenta: number, precioCompra: number): number {
  return precioVenta - precioCompra;
}

export function validarPrecioCompra(precioCompra: number, precioVenta: number): void {
  if (
    !Number.isInteger(precioCompra) ||
    precioCompra <= 0 ||
    !Number.isInteger(precioVenta) ||
    precioVenta <= 0
  ) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  if (precioVenta <= precioCompra) {
    throw new ErrorDeNegocio('PRECIO_VENTA_NO_SUPERA_COMPRA');
  }
}

export function inversionProducto(precioCompra: number, cantidad: number): number {
  return precioCompra * cantidad;
}

export function gananciaPotencialProducto(
  precioVenta: number,
  precioCompra: number,
  cantidad: number,
): number {
  return gananciaPorUnidad(precioVenta, precioCompra) * cantidad;
}

export function gananciaRealizadaVenta(
  precioVentaDeLaVenta: number,
  precioCompra: number,
  cantidad: number,
): number {
  return gananciaPorUnidad(precioVentaDeLaVenta, precioCompra) * cantidad;
}
