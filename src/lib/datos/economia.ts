import { consultar } from '@/lib/db/conexion';
import type { ProductoEconomico, ResumenEconomico } from '@/lib/datos/tipos';
import {
  gananciaPotencialProducto,
  gananciaPorUnidad,
  inversionProducto,
} from '@/lib/reglas/economia';

type FilaProductoEconomico = {
  id: string;
  referencia: string;
  marca: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
  precioCompra: number | null;
};
function enteroSeguro(valor: number | string, nombre: string): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isSafeInteger(numero)) {
    throw new RangeError(`El total de ${nombre} supera el rango seguro de enteros.`);
  }
  return numero;
}

function sumarSeguro(actual: number, siguiente: number, nombre: string): number {
  return enteroSeguro(actual + siguiente, nombre);
}

export async function obtenerEconomia(filtros: { marca?: string } = {}): Promise<ResumenEconomico> {
  const marca = filtros.marca?.trim();
  const filtroMarca = marca ? `%${marca.toLowerCase()}%` : undefined;
  const parametros = filtroMarca === undefined ? [] : [filtroMarca];
  const condicionMarcaProductos = marca ? 'AND lower(marca) LIKE $1' : '';
  const productos = await consultar<FilaProductoEconomico>(
    `SELECT id, referencia, marca, talla, cantidad,
            precio_venta AS "precioVenta", precio_compra AS "precioCompra"
     FROM productos
     WHERE activo = true ${condicionMarcaProductos}
     ORDER BY clave_referencia ASC, clave_talla ASC`,
    parametros,
  );

  let inversionTotal = 0;
  let gananciaPotencialTotal = 0;
  const detalleProductos: ProductoEconomico[] = productos.map((producto) => {
    if (producto.precioCompra === null) {
      return {
        ...producto,
        gananciaPorUnidad: null,
        inversion: null,
        gananciaPotencial: null,
        sinPrecioCompra: true,
      };
    }

    const inversion = enteroSeguro(
      inversionProducto(producto.precioCompra, producto.cantidad),
      'inversión',
    );
    const gananciaPotencial = enteroSeguro(
      gananciaPotencialProducto(
        producto.precioVenta,
        producto.precioCompra,
        producto.cantidad,
      ),
      'ganancia potencial',
    );
    inversionTotal = sumarSeguro(inversionTotal, inversion, 'inversión total');
    gananciaPotencialTotal = sumarSeguro(
      gananciaPotencialTotal,
      gananciaPotencial,
      'ganancia potencial total',
    );

    return {
      ...producto,
      gananciaPorUnidad: gananciaPorUnidad(producto.precioVenta, producto.precioCompra),
      inversion,
      gananciaPotencial,
      sinPrecioCompra: false,
    };
  });

  return {
    inversionTotal,
    gananciaPotencialTotal,
    gananciaRealizadaTotal: null,
    productos: detalleProductos,
  };
}
