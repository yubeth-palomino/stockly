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

export async function obtenerEconomia(
  filtros: { marca?: string },
  empresaId: string,
): Promise<ResumenEconomico> {
  const marca = filtros.marca?.trim();
  const filtroMarca = marca ? `%${marca.toLowerCase()}%` : undefined;
  const parametros = filtroMarca === undefined ? [empresaId] : [empresaId, filtroMarca];
  const condicionMarcaProductos = marca ? 'AND lower(marca) LIKE $2' : '';
  const productos = await consultar<FilaProductoEconomico>(
    `SELECT id, referencia, marca, talla, cantidad,
            precio_venta AS "precioVenta", precio_compra AS "precioCompra"
     FROM productos
     WHERE empresa_id = $1 AND activo = true ${condicionMarcaProductos}
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

  type FilaGananciaRealizada = { gananciaRealizada: number | string };
  const condicionMarcaVentas = marca ? 'AND lower(p.marca) LIKE $2' : '';
  const parametrosVentas = filtroMarca === undefined ? [empresaId] : [empresaId, filtroMarca];
  const filasGananciaRealizada = await consultar<FilaGananciaRealizada>(
    `SELECT COALESCE(
              sum((v.precio_venta::numeric - p.precio_compra::numeric) * v.cantidad),
              0
            )::text AS "gananciaRealizada"
     FROM ventas v
     JOIN productos p ON p.id = v.producto_id AND p.empresa_id = v.empresa_id
     WHERE v.empresa_id = $1
       AND p.precio_compra IS NOT NULL ${condicionMarcaVentas}`,
    parametrosVentas,
  );
  const gananciaRealizadaTotal = enteroSeguro(
    Number(filasGananciaRealizada[0]?.gananciaRealizada ?? 0),
    'ganancia realizada total',
  );

  return {
    inversionTotal,
    gananciaPotencialTotal,
    gananciaRealizadaTotal,
    productos: detalleProductos,
  };
}
