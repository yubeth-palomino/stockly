import Link from 'next/link';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { InsigniaDisponibilidad } from '@/components/panel/InsigniaDisponibilidad';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { obtenerResumen } from '@/lib/dataService';
import { formatearCantidad, formatearPesos } from '@/lib/formato';
import { MODULO_ECONOMICO_ACTIVO } from '@/lib/config/stockly';

export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    throw new Error('No se encontró el usuario Stockly autenticado para cargar el resumen.');
  }
  const resumen = await obtenerResumen(usuario.rol);

  const inversionDisponible =
    usuario.rol === 'dueno' && MODULO_ECONOMICO_ACTIVO ? resumen.inversionTotal : null;
  const metricas = [
    {
      etiqueta: 'Total de productos',
      valor: formatearCantidad(resumen.productosActivos),
      icono: '📦',
      nota: 'Referencias activas',
      tono: 'metricaVerde',
    },
    {
      etiqueta: 'Stock bajo',
      valor: resumen.stockMinimoConfigurado ? formatearCantidad(resumen.productosPorReponer) : '—',
      icono: '⚠️',
      nota: resumen.stockMinimoConfigurado ? 'Productos por reponer' : 'Umbrales sin configurar',
      tono: 'metricaAmbar',
    },
    {
      etiqueta: inversionDisponible !== null ? 'Valor del inventario' : 'Unidades disponibles',
      valor:
        inversionDisponible !== null
          ? formatearPesos(inversionDisponible)
          : formatearCantidad(resumen.unidadesDisponibles),
      icono: inversionDisponible !== null ? '◈' : '▦',
      nota: inversionDisponible !== null ? 'Inversión en existencias' : 'Unidades en existencias',
      tono: 'metricaAzul',
    },
    {
      etiqueta: 'Ventas de hoy',
      valor: formatearCantidad(resumen.ventasHoy),
      icono: '↗',
      nota: 'Operaciones registradas',
      tono: 'metricaRosa',
    },
  ];

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>VISTA GENERAL</p>
          <h1 className={styles.titulo}>Tu inventario, en equilibrio.</h1>
          <p className={styles.descripcion}>Un resumen claro de tus existencias y actividad.</p>
        </div>
      </header>

      <section className={styles.metricas} aria-label="Indicadores del inventario">
        {metricas.map((metrica) => (
          <article className={`${styles.metrica} ${styles[metrica.tono]}`} key={metrica.etiqueta}>
            <span className={styles.iconoMetrica} aria-hidden="true">
              {metrica.icono}
            </span>
            <span className={styles.metricaEtiqueta}>{metrica.etiqueta}</span>
            <strong className={styles.metricaValor}>{metrica.valor}</strong>
            <span className={styles.metricaNota}>{metrica.nota}</span>
          </article>
        ))}
      </section>
      {usuario.rol === 'dueno' && resumen.gananciaRealizadaTotal === null && (
        <p className={styles.textoSuave} role="note">
          La ganancia realizada requiere una empresa autorizada y costos históricos por venta.
        </p>
      )}

      {resumen.stockMinimoConfigurado && (
        <section className={styles.seccionResumen} aria-labelledby="reponer-titulo">
          <div className={styles.encabezadoSeccion}>
            <div>
              <h2 id="reponer-titulo">
                Por reponer ({formatearCantidad(resumen.productosPorReponer)})
              </h2>
              <p>Productos agotados o en su umbral mínimo de existencias.</p>
            </div>
            <Link className={styles.enlaceTexto} href="/panel/inventario">
              Ver inventario
            </Link>
          </div>
          {resumen.listaPorReponer.length === 0 ? (
            <EstadoVacio titulo="No hay productos por reponer">
              Todo tu inventario está por encima de su stock mínimo.
            </EstadoVacio>
          ) : (
            <div className={styles.listaAgotados}>
              {resumen.listaPorReponer.map((producto) => (
                <article className={styles.filaAgotado} key={producto.id}>
                  <strong>{producto.referencia}</strong>
                  <span className={styles.textoSuave}>
                    {producto.marca} · Talla {producto.talla}
                  </span>
                  <span className={styles.textoSuave}>
                    {formatearCantidad(producto.cantidad)} / mínimo{' '}
                    {formatearCantidad(producto.stockMinimo ?? 0)}
                  </span>
                  <Link className={styles.enlaceTexto} href={`/panel/inventario/${producto.id}`}>
                    Ver detalle
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.seccionResumen} aria-labelledby="agotados-titulo">
        <div className={styles.encabezadoSeccion}>
          <div>
            <h2 id="agotados-titulo">Productos agotados</h2>
            <p>Artículos activos que necesitan una nueva entrada.</p>
          </div>
          <Link className={styles.enlaceTexto} href="/panel/inventario">
            Ver inventario
          </Link>
        </div>

        {resumen.listaAgotados.length === 0 ? (
          <EstadoVacio titulo="No hay productos agotados">
            Todo tu inventario activo tiene unidades disponibles.
          </EstadoVacio>
        ) : (
          <div className={styles.listaAgotados}>
            {resumen.listaAgotados.map((producto) => (
              <article className={styles.filaAgotado} key={producto.id}>
                <strong>{producto.referencia}</strong>
                <span className={styles.textoSuave}>
                  {producto.marca} · Talla {producto.talla}
                </span>
                <InsigniaDisponibilidad activo={producto.activo} disponible={producto.disponible} />
                <Link
                  className={styles.enlaceTexto}
                  href={`/panel/inventario/${producto.id}`}
                  aria-label={`Ver detalle de ${producto.referencia}`}
                >
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <nav className={styles.accesosRapidos} aria-label="Accesos rápidos">
        <Link className={styles.accesoRapido} href="/panel/inventario/nuevo">
          <span>
            <strong>Registrar entrada</strong>
            <small>Agrega unidades al inventario.</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link className={styles.accesoRapido} href="/panel/ventas/nueva">
          <span>
            <strong>Registrar venta</strong>
            <small>Registra una salida de productos.</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link className={styles.accesoRapido} href="/panel/evolucion">
          <span>
            <strong>Evolución de ventas</strong>
            <small>Consulta ingresos, unidades y rotación.</small>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </nav>

      <footer className={styles.pie}>
        <span>Stockly © 2026</span>
        <span>Gestión de inventario · Datos actualizados al cargar</span>
      </footer>
    </>
  );
}
