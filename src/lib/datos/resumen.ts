import { consultar } from '@/lib/db/conexion';
import type { FilaProducto, ResumenPanel } from '@/lib/datos/tipos';
import type { Rol } from '@/lib/reglas/roles';
import { hoyBogota } from '@/lib/reglas/fechas';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { columnasProducto } from '@/lib/datos/productos';

type ConteosPanel = {
  productosActivos: number;
  unidadesDisponibles: number;
  productosAgotados: number;
  ventasHoy: number;
};

export async function obtenerResumen(rol: Rol): Promise<ResumenPanel> {
  const [conteos, listaAgotados] = await Promise.all([
    consultar<ConteosPanel>(
      `SELECT
         (SELECT count(*)::integer FROM productos WHERE activo = true) AS "productosActivos",
         (SELECT coalesce(sum(cantidad), 0)::integer FROM productos WHERE activo = true) AS "unidadesDisponibles",
         (SELECT count(*)::integer FROM productos WHERE activo = true AND cantidad = 0) AS "productosAgotados",
         (SELECT count(*)::integer FROM ventas WHERE fecha_venta = $1) AS "ventasHoy"`,
      [hoyBogota()],
    ),
    consultar<FilaProducto>(
      `SELECT ${columnasProducto(rol)}
       FROM v_productos
       WHERE activo = true AND cantidad = 0
       ORDER BY clave_referencia ASC, clave_talla ASC
       LIMIT $1`,
      [LIMITE_LISTADO],
    ),
  ]);

  const totales = conteos[0];
  if (!totales) throw new Error('La base de datos no devolvió los indicadores del panel.');
  const resumen: ResumenPanel = {
    ...totales,
    listaAgotados,
    inversionTotal: null,
    gananciaPotencialTotal: null,
    gananciaRealizadaTotal: null,
  };

  return resumen;
}
