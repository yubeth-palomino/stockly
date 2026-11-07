import Link from 'next/link';
import type { EvolucionVentas } from '@/lib/datos/evolucionVentas';
import { formatearCantidad, formatearPesos } from '@/lib/formato';
import styles from './evolucionVentas.module.css';

function variacionTexto(valor: number | null): string {
  if (valor === null) return 'Nuevo periodo sin comparación previa';
  const signo = valor > 0 ? '+' : '';
  return `${signo}${valor.toFixed(1)}% frente al periodo anterior`;
}

function etiquetaFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${fecha}T00:00:00.000Z`));
}

function GraficoIngresos({ datos }: { datos: EvolucionVentas['serie'] }) {
  if (datos.every((dato) => dato.ingresos === 0)) {
    return <p className={styles.vacio}>No hay ventas en el rango seleccionado.</p>;
  }
  const alto = 220;
  const ancho = 720;
  const maximo = Math.max(...datos.map((dato) => dato.ingresos), 1);
  const puntos = datos.map((dato, indice) => ({
    x: datos.length === 1 ? ancho / 2 : 20 + (indice * (ancho - 40)) / (datos.length - 1),
    y: alto - 24 - (dato.ingresos / maximo) * (alto - 56),
    fecha: dato.fecha,
    ingresos: dato.ingresos,
  }));
  const linea = puntos.map(({ x, y }, indice) => `${indice === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${linea} L ${puntos.at(-1)?.x ?? ancho} ${alto - 24} L ${puntos[0]?.x ?? 0} ${alto - 24} Z`;
  const etiquetas = [puntos[0], puntos[Math.floor(puntos.length / 2)], puntos.at(-1)]
    .filter((punto, indice, lista) => punto && lista.findIndex((otro) => otro?.fecha === punto.fecha) === indice);

  return (
    <div className={styles.graficoContenedor}>
      <svg
        aria-label={`Ingresos por periodo: ${datos.map((dato) => `${dato.fecha}, ${formatearPesos(dato.ingresos)}`).join('; ')}`}
        className={styles.grafico}
        role="img"
        viewBox={`0 0 ${ancho} ${alto}`}
      >
        <defs>
          <linearGradient id="relleno-ingresos" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c19a6b" stopOpacity=".34" />
            <stop offset="100%" stopColor="#c19a6b" stopOpacity=".03" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((fila) => (
          <line
            key={fila}
            x1="20"
            x2={ancho - 20}
            y1={28 + fila * 52}
            y2={28 + fila * 52}
            stroke="#e8dcc8"
            strokeDasharray="4 5"
          />
        ))}
        <path d={area} fill="url(#relleno-ingresos)" />
        <path d={linea} fill="none" stroke="#9a7449" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {puntos.map((punto) => (
          <circle
            key={punto.fecha}
            cx={punto.x}
            cy={punto.y}
            r="4"
            fill="#9a7449"
          >
            <title>{`${etiquetaFecha(punto.fecha)}: ${formatearPesos(punto.ingresos)}`}</title>
          </circle>
        ))}
        {etiquetas.map((punto) => punto && (
          <text key={punto.fecha} x={punto.x} y={alto - 3} textAnchor="middle">
            {etiquetaFecha(punto.fecha)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function GraficoUnidades({ datos }: { datos: EvolucionVentas['serie'] }) {
  const maximo = Math.max(...datos.map((dato) => dato.unidades), 1);
  return (
    <div className={styles.barras} role="img" aria-label="Unidades vendidas por periodo">
      {datos.length === 0 || datos.every((dato) => dato.unidades === 0) ? (
        <p className={styles.vacio}>No hay unidades vendidas en este periodo.</p>
      ) : (
        datos.slice(-24).map((dato) => (
          <div className={styles.columnaBarra} key={dato.fecha}>
            <span className={styles.valorBarra}>{formatearCantidad(dato.unidades)}</span>
            <span
              className={styles.barra}
              style={{ height: `${Math.max(4, (dato.unidades / maximo) * 100)}%` }}
              title={`${etiquetaFecha(dato.fecha)}: ${formatearCantidad(dato.unidades)} unidades`}
            />
            <span className={styles.etiquetaBarra}>{etiquetaFecha(dato.fecha)}</span>
          </div>
        ))
      )}
    </div>
  );
}

function TablaProductos({
  titulo,
  productos,
}: {
  titulo: string;
  productos: EvolucionVentas['productosMasVendidos'];
}) {
  return (
    <section className={styles.tarjeta} aria-label={titulo}>
      <h2>{titulo}</h2>
      {productos.length === 0 ? (
        <p className={styles.vacio}>No hay productos activos para mostrar.</p>
      ) : (
        <div className={styles.tablaContenedor}>
          <table>
            <thead>
              <tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={`${producto.referencia}-${producto.talla}`}>
                  <td>
                    <strong>{producto.referencia}</strong>
                    <small>{producto.marca} · {producto.talla}</small>
                  </td>
                  <td>{formatearCantidad(producto.unidades)}</td>
                  <td>{formatearPesos(producto.ingresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ListaCategorias({
  titulo,
  filas,
}: {
  titulo: string;
  filas: Array<{ nombre: string; unidades: number; ingresos: number }>;
}) {
  return (
    <section className={styles.tarjeta}>
      <h2>{titulo}</h2>
      {filas.length === 0 ? (
        <p className={styles.vacio}>No hay ventas en el rango seleccionado.</p>
      ) : (
        <ol className={styles.listaCategorias}>
          {filas.map((fila) => (
            <li key={fila.nombre}>
              <span>{fila.nombre}</span>
              <small>{formatearCantidad(fila.unidades)} uds.</small>
              <strong>{formatearPesos(fila.ingresos)}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function EvolucionVentasPanel({ datos }: { datos: EvolucionVentas }) {
  const desde = datos.rango.desde;
  const hasta = datos.rango.hasta;
  const ventasAnteriores = datos.ingresosAnteriores;

  return (
    <>
      <form className={styles.filtros} action="/panel/evolucion" method="get">
        <label>
          Rango
          <select name="rango" defaultValue={datos.filtros.rango}>
            <option value="hoy">Hoy</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="30dias">Últimos 30 días</option>
            <option value="mes">Mes actual</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>
        <label>
          Agrupar por
          <select name="agrupacion" defaultValue={datos.filtros.agrupacion}>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </label>
        {datos.filtros.rango === 'personalizado' && (
          <>
            <label>Desde<input type="date" name="desde" defaultValue={datos.filtros.desde} required /></label>
            <label>Hasta<input type="date" name="hasta" defaultValue={datos.filtros.hasta} required /></label>
          </>
        )}
        <button type="submit">Aplicar filtros</button>
      </form>

      <p className={styles.rangoTexto}>
        {desde} al {hasta} · periodo anterior: {datos.anterior.desde} al {datos.anterior.hasta}
      </p>

      <section className={styles.kpis} aria-label="Indicadores de ventas">
        <article><span>Ventas de hoy</span><strong>{formatearPesos(datos.ingresosHoy)}</strong></article>
        <article><span>Ventas de la semana</span><strong>{formatearPesos(datos.ingresosSemana)}</strong></article>
        <article><span>Ventas del mes</span><strong>{formatearPesos(datos.ingresosMes)}</strong></article>
        <article><span>Ticket promedio del rango</span><strong>{datos.promedioTicket === null ? '—' : formatearPesos(datos.promedioTicket)}</strong></article>
        <article><span>Unidades vendidas</span><strong>{formatearCantidad(datos.unidades)}</strong></article>
        <article><span>Productos agotados</span><strong>{formatearCantidad(datos.stockAgotado)}</strong></article>
        <article><span>Valor del inventario a precio de venta</span><strong>{formatearPesos(datos.valorVentaInventario)}</strong></article>
      </section>

      <div className={styles.graficos}>
        <section className={styles.tarjeta}>
          <div className={styles.encabezadoTarjeta}>
            <div><h2>Evolución de ingresos</h2><p>{variacionTexto(datos.variacion)}</p></div>
            <strong>{formatearPesos(datos.ingresos)}</strong>
          </div>
          <GraficoIngresos datos={datos.serie} />
        </section>
        <section className={styles.tarjeta}>
          <div className={styles.encabezadoTarjeta}>
            <div><h2>Unidades por periodo</h2><p>Unidades netas tras devoluciones.</p></div>
            <strong>{formatearCantidad(datos.unidades)}</strong>
          </div>
          <GraficoUnidades datos={datos.serie} />
        </section>
      </div>

      <section className={styles.seccion}>
        <TablaProductos titulo="Productos más vendidos" productos={datos.productosMasVendidos} />
        <TablaProductos titulo="Productos con menor rotación" productos={datos.productosMenosVendidos} />
      </section>
      <section className={styles.seccion}>
        <ListaCategorias titulo="Ventas por marca" filas={datos.porMarca} />
        <ListaCategorias titulo="Ventas por talla" filas={datos.porTalla} />
        {datos.porTrabajador.length > 0 && (
          <ListaCategorias titulo="Ventas por trabajador" filas={datos.porTrabajador} />
        )}
      </section>

      <section className={styles.tarjeta}>
        <h2>Alertas de inventario</h2>
        <p>
          {datos.umbralStockConfigurado
            ? `${formatearCantidad(datos.stockBajo)} productos con stock bajo y ${formatearCantidad(datos.stockAgotado)} agotados.`
            : `Hay ${formatearCantidad(datos.stockAgotado)} productos agotados. El umbral de stock bajo aún no está configurado.`}
        </p>
        <Link href="/panel/inventario">Revisar inventario</Link>
      </section>

      {datos.economia && (
        <section className={styles.tarjeta}>
          <h2>Margen y utilidad · Solo dueño</h2>
          {!datos.economia.disponible ? (
            <p className={styles.vacio}>
              No hay costo histórico por venta disponible. No se infiere el costo actual del producto como si fuera histórico.
            </p>
          ) : (
            <>
              <div className={styles.kpisEconomicos}>
                <article><span>Ingresos con costo registrado</span><strong>{formatearPesos(datos.economia.ingresosConCosto)}</strong></article>
                <article><span>Costo</span><strong>{formatearPesos(datos.economia.costo)}</strong></article>
                <article><span>Utilidad</span><strong>{formatearPesos(datos.economia.utilidad)}</strong></article>
                <article><span>Margen</span><strong>{datos.economia.margen === null ? '—' : `${datos.economia.margen.toFixed(1)}%`}</strong></article>
              </div>
              <p>{formatearCantidad(datos.economia.unidadesSinCosto)} unidades vendidas sin costo registrado.</p>
            </>
          )}
        </section>
      )}

      <details className={styles.comparacion}>
        <summary>Ver comparación contra el periodo anterior</summary>
        <p>Ingresos del rango actual · SQL agregado: <strong>{formatearPesos(datos.ingresos)}</strong></p>
        <p>Ingresos del rango anterior · mismo cálculo y duración: <strong>{formatearPesos(ventasAnteriores)}</strong></p>
        <p>Variación calculada: <strong>{variacionTexto(datos.variacion)}</strong></p>
        <p className={styles.nota}>Comparación generada en el servidor desde ventas registradas, descontando devoluciones cuando existe esa columna. La validación independiente contra SQL manual queda pendiente hasta disponer de una BD de pruebas aislada.</p>
      </details>
    </>
  );
}
