import { consultar } from '@/lib/db/conexion';
import type { Rol } from '@/lib/reglas/roles';
import {
  inicioSemanaBogota,
  obtenerRangoAnterior,
  obtenerRangoEvolucion,
  type FiltroRangoEvolucion,
  type PeriodoEvolucion,
  type RangoFechas,
} from '@/lib/reglas/evolucionVentas';

type FilaColumnas = { column_name: string };
type FilaTotales = {
  ingresos: string;
  ingresosAnteriores: string;
  unidades: string;
  tickets: string;
  ingresosHoy: string;
  ingresosSemana: string;
  ingresosMes: string;
  unidadesSinCosto: string;
};
type FilaSerie = { fecha: string; ingresos: string; unidades: string };
type FilaProducto = {
  referencia: string;
  marca: string;
  talla: string;
  unidades: string;
  ingresos: string;
};
type ProductoEvolucion = {
  referencia: string;
  marca: string;
  talla: string;
  unidades: number;
  ingresos: number;
};
type FilaCategoria = { nombre: string; unidades: string; ingresos: string };
type FilaInventario = {
  agotados: string;
  stockBajo: string;
  valorVentaInventario: string;
};
type FilaEconomia = {
  ingresosConCosto: string;
  costo: string;
  utilidad: string;
  unidadesSinCosto: string;
};

export type FiltrosEvolucionVentas = {
  rango: FiltroRangoEvolucion;
  agrupacion: PeriodoEvolucion;
  desde?: string;
  hasta?: string;
};

export type EvolucionVentas = {
  filtros: FiltrosEvolucionVentas;
  rango: RangoFechas;
  anterior: RangoFechas;
  ingresos: number;
  ingresosAnteriores: number;
  unidades: number;
  promedioTicket: number | null;
  ingresosHoy: number;
  ingresosSemana: number;
  ingresosMes: number;
  variacion: number | null;
  stockAgotado: number;
  stockBajo: number;
  umbralStockConfigurado: boolean;
  valorVentaInventario: number;
  serie: Array<{ fecha: string; ingresos: number; unidades: number }>;
  productosMasVendidos: ProductoEvolucion[];
  productosMenosVendidos: ProductoEvolucion[];
  porMarca: Array<{ nombre: string; unidades: number; ingresos: number }>;
  porTalla: Array<{ nombre: string; unidades: number; ingresos: number }>;
  porTrabajador: Array<{ nombre: string; unidades: number; ingresos: number }>;
  economia: {
    disponible: boolean;
    ingresosConCosto: number;
    costo: number;
    utilidad: number;
    margen: number | null;
    unidadesSinCosto: number;
  } | null;
};

function entero(valor: string | null | undefined, nombre: string): number {
  const numero = Number(valor ?? 0);
  if (!Number.isSafeInteger(numero) || numero < 0) {
    throw new RangeError(`El indicador ${nombre} superó el rango de enteros seguro.`);
  }
  return numero;
}

function enteroConSigno(valor: string | null | undefined, nombre: string): number {
  const numero = Number(valor ?? 0);
  if (!Number.isSafeInteger(numero)) {
    throw new RangeError(`El indicador ${nombre} superó el rango de enteros seguro.`);
  }
  return numero;
}

function convertirCategorias(filas: FilaCategoria[]) {
  return filas.map((fila) => ({
    nombre: fila.nombre,
    unidades: entero(fila.unidades, 'unidades por categoría'),
    ingresos: entero(fila.ingresos, 'ingresos por categoría'),
  }));
}

export async function obtenerEvolucionVentas(
  filtros: FiltrosEvolucionVentas,
  rol: Rol,
  hoy: string,
): Promise<EvolucionVentas> {
  const rango = obtenerRangoEvolucion(
    filtros.rango,
    hoy,
    filtros.desde && filtros.hasta
      ? { desde: filtros.desde, hasta: filtros.hasta }
      : undefined,
  );
  const anterior = obtenerRangoAnterior(rango);
  const mes = obtenerRangoEvolucion('mes', hoy);
  const semanaDesde = inicioSemanaBogota(hoy);
  const columnas = await consultar<FilaColumnas>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name IN ('ventas', 'productos')
       AND column_name IN ('cantidad_devuelta', 'costo_unitario', 'stock_minimo')`,
  );
  const disponibles = new Set(columnas.map(({ column_name }) => column_name));
  const devolucion = disponibles.has('cantidad_devuelta')
    ? 'COALESCE(v.cantidad_devuelta, 0)'
    : '0';
  const unidades = `GREATEST(v.cantidad - ${devolucion}, 0)`;
  const stockBajoExpr = disponibles.has('stock_minimo')
    ? 'count(*) FILTER (WHERE cantidad > 0 AND cantidad <= stock_minimo)'
    : '0::bigint';

  const consultaTotales = consultar<FilaTotales>(
    `SELECT
       COALESCE(sum(v.precio_venta::numeric * ${unidades}) FILTER (
         WHERE v.fecha_venta BETWEEN $1::date AND $2::date
       ), 0)::text AS ingresos,
       COALESCE(sum(v.precio_venta::numeric * ${unidades}) FILTER (
         WHERE v.fecha_venta BETWEEN $3::date AND $4::date
       ), 0)::text AS "ingresosAnteriores",
       COALESCE(sum(${unidades}) FILTER (
         WHERE v.fecha_venta BETWEEN $1::date AND $2::date
       ), 0)::text AS unidades,
       count(*) FILTER (
         WHERE v.fecha_venta BETWEEN $1::date AND $2::date AND ${unidades} > 0
       )::text AS tickets,
       COALESCE(sum(v.precio_venta::numeric * ${unidades}) FILTER (
         WHERE v.fecha_venta = $5::date
       ), 0)::text AS "ingresosHoy",
       COALESCE(sum(v.precio_venta::numeric * ${unidades}) FILTER (
         WHERE v.fecha_venta BETWEEN $6::date AND $5::date
       ), 0)::text AS "ingresosSemana",
       COALESCE(sum(v.precio_venta::numeric * ${unidades}) FILTER (
         WHERE v.fecha_venta BETWEEN $7::date AND $5::date
       ), 0)::text AS "ingresosMes",
       COALESCE(sum(${unidades}) FILTER (
         WHERE v.fecha_venta BETWEEN $1::date AND $2::date
           AND ${disponibles.has('costo_unitario') ? 'v.costo_unitario IS NULL' : 'true'}
       ), 0)::text AS "unidadesSinCosto"
     FROM public.ventas AS v
     WHERE (v.fecha_venta BETWEEN $1::date AND $2::date)
        OR (v.fecha_venta BETWEEN $3::date AND $4::date)`,
    [rango.desde, rango.hasta, anterior.desde, anterior.hasta, hoy, semanaDesde, mes.desde],
  );

  const consultaSerie = consultar<FilaSerie>(
    `WITH calendario AS (
       SELECT generate_series(
         date_trunc($3, $1::date::timestamp),
         date_trunc($3, $2::date::timestamp),
         CASE $3
           WHEN 'mes' THEN interval '1 month'
           WHEN 'semana' THEN interval '1 week'
           ELSE interval '1 day'
         END
       )::date AS fecha
     ),
     agregados AS (
       SELECT date_trunc($3, v.fecha_venta::timestamp)::date AS fecha,
              sum(v.precio_venta::numeric * ${unidades})::text AS ingresos,
              sum(${unidades})::text AS unidades
       FROM public.ventas AS v
       WHERE v.fecha_venta BETWEEN $1::date AND $2::date
       GROUP BY 1
     )
     SELECT calendario.fecha::text AS fecha,
            COALESCE(agregados.ingresos, '0') AS ingresos,
            COALESCE(agregados.unidades, '0') AS unidades
     FROM calendario
     LEFT JOIN agregados USING (fecha)
     ORDER BY calendario.fecha`,
    [rango.desde, rango.hasta, filtros.agrupacion],
  );

  const consultaInventario = consultar<FilaInventario>(
    `SELECT
       count(*) FILTER (WHERE cantidad = 0)::text AS agotados,
       ${stockBajoExpr}::text AS "stockBajo",
       COALESCE(sum(cantidad::numeric * precio_venta), 0)::text AS "valorVentaInventario"
     FROM public.productos
     WHERE activo = true`,
  );

  const consultaProductos = consultar<FilaProducto>(
    `SELECT p.referencia, p.marca, p.talla,
            COALESCE(sum(${unidades}), 0)::text AS unidades,
            COALESCE(sum(v.precio_venta::numeric * ${unidades}), 0)::text AS ingresos
     FROM public.productos AS p
     LEFT JOIN public.ventas AS v
       ON v.producto_id = p.id
      AND v.fecha_venta BETWEEN $1::date AND $2::date
     WHERE p.activo = true
     GROUP BY p.id, p.referencia, p.marca, p.talla
     ORDER BY sum(${unidades}) DESC NULLS LAST, ingresos DESC
     LIMIT 10`,
    [rango.desde, rango.hasta],
  );
  const consultaMenorRotacion = consultar<FilaProducto>(
    `SELECT p.referencia, p.marca, p.talla,
            COALESCE(sum(${unidades}), 0)::text AS unidades,
            COALESCE(sum(v.precio_venta::numeric * ${unidades}), 0)::text AS ingresos
     FROM public.productos AS p
     LEFT JOIN public.ventas AS v
       ON v.producto_id = p.id
      AND v.fecha_venta BETWEEN $1::date AND $2::date
     WHERE p.activo = true
     GROUP BY p.id, p.referencia, p.marca, p.talla
     ORDER BY sum(${unidades}) ASC NULLS FIRST, p.referencia, p.talla
     LIMIT 10`,
    [rango.desde, rango.hasta],
  );
  const consultaMarca = consultar<FilaCategoria>(
    `SELECT COALESCE(NULLIF(btrim(p.marca), ''), 'Sin marca') AS nombre,
            sum(${unidades})::text AS unidades,
            sum(v.precio_venta::numeric * ${unidades})::text AS ingresos
     FROM public.ventas AS v
     JOIN public.productos AS p ON p.id = v.producto_id
     WHERE v.fecha_venta BETWEEN $1::date AND $2::date
     GROUP BY 1
     ORDER BY sum(v.precio_venta::numeric * ${unidades}) DESC
     LIMIT 10`,
    [rango.desde, rango.hasta],
  );
  const consultaTalla = consultar<FilaCategoria>(
    `SELECT COALESCE(NULLIF(btrim(v.talla), ''), 'Sin talla') AS nombre,
            sum(${unidades})::text AS unidades,
            sum(v.precio_venta::numeric * ${unidades})::text AS ingresos
     FROM public.ventas AS v
     WHERE v.fecha_venta BETWEEN $1::date AND $2::date
     GROUP BY 1
     ORDER BY sum(${unidades}) DESC
     LIMIT 10`,
    [rango.desde, rango.hasta],
  );
  const consultaEconomia =
    rol === 'dueno' && disponibles.has('costo_unitario')
      ? consultar<FilaEconomia>(
          `SELECT
             COALESCE(sum(v.precio_venta::numeric * ${unidades})
               FILTER (WHERE v.costo_unitario IS NOT NULL), 0)::text AS "ingresosConCosto",
             COALESCE(sum(v.costo_unitario::numeric * ${unidades})
               FILTER (WHERE v.costo_unitario IS NOT NULL), 0)::text AS costo,
             COALESCE(sum((v.precio_venta - v.costo_unitario)::numeric * ${unidades})
               FILTER (WHERE v.costo_unitario IS NOT NULL), 0)::text AS utilidad,
             COALESCE(sum(${unidades})
               FILTER (WHERE v.costo_unitario IS NULL), 0)::text AS "unidadesSinCosto"
           FROM public.ventas AS v
           WHERE v.fecha_venta BETWEEN $1::date AND $2::date`,
          [rango.desde, rango.hasta],
        )
      : Promise.resolve([]);
  const consultaTrabajadores =
    rol === 'dueno'
      ? consultar<FilaCategoria>(
          `SELECT COALESCE(NULLIF(btrim(u.nombre), ''), 'Usuario sin perfil') AS nombre,
                  sum(${unidades})::text AS unidades,
                  sum(v.precio_venta::numeric * ${unidades})::text AS ingresos
           FROM public.ventas AS v
           LEFT JOIN public.usuarios AS u ON u.id = v.usuario_id
           WHERE v.fecha_venta BETWEEN $1::date AND $2::date
           GROUP BY 1
           ORDER BY sum(v.precio_venta::numeric * ${unidades}) DESC
           LIMIT 10`,
          [rango.desde, rango.hasta],
        )
      : Promise.resolve([]);

  const [
    filasTotales,
    serie,
    inventario,
    masVendidos,
    menosVendidos,
    porMarca,
    porTalla,
    filasEconomia,
    porTrabajador,
  ] = await Promise.all([
    consultaTotales,
    consultaSerie,
    consultaInventario,
    consultaProductos,
    consultaMenorRotacion,
    consultaMarca,
    consultaTalla,
    consultaEconomia,
    consultaTrabajadores,
  ]);
  const totales = filasTotales[0];
  const existencias = inventario[0];
  if (!totales || !existencias) throw new Error('No se pudieron cargar los indicadores.');

  const ingresos = entero(totales.ingresos, 'ingresos');
  const ingresosAnteriores = entero(totales.ingresosAnteriores, 'ingresos anteriores');
  const economia = filasEconomia[0];
  const ingresosConCosto = economia ? entero(economia.ingresosConCosto, 'ingresos con costo') : 0;
  const utilidad = economia ? enteroConSigno(economia.utilidad, 'utilidad') : 0;

  return {
    filtros,
    rango,
    anterior,
    ingresos,
    ingresosAnteriores,
    unidades: entero(totales.unidades, 'unidades'),
    promedioTicket: entero(totales.tickets, 'cantidad de tickets') === 0
      ? null
      : Math.round(ingresos / entero(totales.tickets, 'cantidad de tickets')),
    ingresosHoy: entero(totales.ingresosHoy, 'ingresos de hoy'),
    ingresosSemana: entero(totales.ingresosSemana, 'ingresos de la semana'),
    ingresosMes: entero(totales.ingresosMes, 'ingresos del mes'),
    variacion:
      ingresosAnteriores === 0
        ? ingresos === 0
          ? 0
          : null
        : ((ingresos - ingresosAnteriores) / ingresosAnteriores) * 100,
    stockAgotado: entero(existencias.agotados, 'productos agotados'),
    stockBajo: entero(existencias.stockBajo, 'productos con stock bajo'),
    umbralStockConfigurado: disponibles.has('stock_minimo'),
    valorVentaInventario: entero(existencias.valorVentaInventario, 'valor de inventario'),
    serie: serie.map((fila) => ({
      fecha: fila.fecha,
      ingresos: entero(fila.ingresos, 'ingresos por periodo'),
      unidades: entero(fila.unidades, 'unidades por periodo'),
    })),
    productosMasVendidos: masVendidos.map((producto) => ({
      ...producto,
      unidades: entero(producto.unidades, 'unidades por producto'),
      ingresos: entero(producto.ingresos, 'ingresos por producto'),
    })),
    productosMenosVendidos: menosVendidos.map((producto) => ({
      ...producto,
      unidades: entero(producto.unidades, 'unidades por producto'),
      ingresos: entero(producto.ingresos, 'ingresos por producto'),
    })),
    porMarca: convertirCategorias(porMarca),
    porTalla: convertirCategorias(porTalla),
    porTrabajador: convertirCategorias(porTrabajador),
    economia: rol !== 'dueno'
      ? null
      : {
          disponible: Boolean(economia),
          ingresosConCosto,
          costo: economia ? entero(economia.costo, 'costo') : 0,
          utilidad,
          margen: ingresosConCosto === 0 ? null : (utilidad / ingresosConCosto) * 100,
          unidadesSinCosto: economia
            ? entero(economia.unidadesSinCosto, 'unidades sin costo')
            : entero(totales.unidadesSinCosto, 'unidades sin costo'),
        },
  };
}
