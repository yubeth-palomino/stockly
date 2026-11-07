import { consultar } from '@/lib/db/conexion';
import type { FilaProducto, ResumenPanel } from '@/lib/datos/tipos';
import type { Rol } from '@/lib/reglas/roles';
import { hoyBogota } from '@/lib/reglas/fechas';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { columnasProducto } from '@/lib/datos/productos';
import { obtenerEconomia } from '@/lib/datos/economia';
import { MODULO_ECONOMICO_ACTIVO } from '@/lib/config/stockly';

type ConteosPanel = {
  productosActivos: number;
  unidadesDisponibles: number;
  productosAgotados: number;
  ventasHoy: number;
};

async function stockMinimoDisponible(): Promise<boolean> {
  const columnas = await consultar<{ existe: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'productos'
         AND column_name = 'stock_minimo'
     ) AS existe`,
  );
  return columnas[0]?.existe === true;
}

export async function contarProductosPorReponer(): Promise<number> {
  if (!(await stockMinimoDisponible())) return 0;
  const filas = await consultar<{ cantidad: number }>(
    `SELECT count(*)::integer AS cantidad
     FROM productos
     WHERE activo = true
       AND stock_minimo IS NOT NULL
       AND cantidad <= stock_minimo`,
  );
  return filas[0]?.cantidad ?? 0;
}

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
    productosPorReponer: 0,
    stockMinimoConfigurado: false,
    listaAgotados,
    listaPorReponer: [],
    inversionTotal: null,
    gananciaPotencialTotal: null,
    gananciaRealizadaTotal: null,
  };

  if (await stockMinimoDisponible()) {
    const [conteosReposicion, listaPorReponer] = await Promise.all([
      consultar<{ cantidad: number }>(
        `SELECT count(*)::integer AS cantidad
         FROM productos
         WHERE activo = true
           AND stock_minimo IS NOT NULL
           AND cantidad <= stock_minimo`,
      ),
      consultar<FilaProducto>(
        `SELECT ${columnasProducto(rol)}
         FROM v_productos
         WHERE activo = true
           AND stock_minimo IS NOT NULL
           AND cantidad <= stock_minimo
         ORDER BY cantidad ASC, clave_referencia ASC, clave_talla ASC
         LIMIT $1`,
        [LIMITE_LISTADO],
      ),
    ]);
    resumen.productosPorReponer = conteosReposicion[0]?.cantidad ?? 0;
    resumen.stockMinimoConfigurado = true;
    resumen.listaPorReponer = listaPorReponer;
  }

  if (rol === 'dueno' && MODULO_ECONOMICO_ACTIVO) {
    const economia = await obtenerEconomia();
    resumen.inversionTotal = economia.inversionTotal;
    resumen.gananciaPotencialTotal = economia.gananciaPotencialTotal;
    resumen.gananciaRealizadaTotal = economia.gananciaRealizadaTotal;
  }

  return resumen;
}
