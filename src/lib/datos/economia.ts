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

type FilaGananciaRealizada = { total: string };

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
  const parametros = marca ? [`%${marca.toLowerCase()}%`] : [];
  const condicionMarcaProductos = marca ? 'AND lower(marca) LIKE $1' : '';
  const condicionMarcaVentas = marca ? 'AND lower(p.marca) LIKE $1' : '';

  const [productos, filasGanancia] = await Promise.all([
    consultar<FilaProductoEconomico>(
      `SELECT id, referencia, marca, talla, cantidad,
              precio_venta AS "precioVenta", precio_compra AS "precioCompra"
       FROM productos
       WHERE activo = true ${condicionMarcaProductos}
       ORDER BY clave_referencia ASC, clave_talla ASC`,
      parametros,
    ),
    consultar<FilaGananciaRealizada>(
      `SELECT COALESCE(
                SUM((v.precio_venta::bigint - p.precio_compra::bigint) * v.cantidad::bigint),
                0
              )::text AS total
       FROM ventas v
       JOIN productos p ON p.id = v.producto_id
       WHERE p.precio_compra IS NOT NULL ${condicionMarcaVentas}`,
      parametros,
    ),
  ]);

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

  const gananciaRealizadaTotal = enteroSeguro(
    filasGanancia[0]?.total ?? '0',
    'ganancia realizada',
  );
  return {
    inversionTotal,
    gananciaPotencialTotal,
    gananciaRealizadaTotal,
    productos: detalleProductos,
  };
}
