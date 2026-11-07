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

  const metricas = [
    { etiqueta: 'Productos activos', valor: formatearCantidad(resumen.productosActivos) },
    { etiqueta: 'Unidades disponibles', valor: formatearCantidad(resumen.unidadesDisponibles) },
    { etiqueta: 'Productos agotados', valor: formatearCantidad(resumen.productosAgotados) },
    { etiqueta: 'Ventas de hoy', valor: formatearCantidad(resumen.ventasHoy) },
  ];

  if (usuario.rol === 'dueno' && MODULO_ECONOMICO_ACTIVO) {
    if (resumen.inversionTotal !== null) {
      metricas.push({ etiqueta: 'Inversión total', valor: formatearPesos(resumen.inversionTotal) });
    }
    if (resumen.gananciaPotencialTotal !== null) {
      metricas.push({
        etiqueta: 'Ganancia potencial',
        valor: formatearPesos(resumen.gananciaPotencialTotal),
      });
    }
    if (resumen.gananciaRealizadaTotal !== null) {
      metricas.push({
        etiqueta: 'Ganancia realizada',
        valor: formatearPesos(resumen.gananciaRealizadaTotal),
      });
    }
  }

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Vista general</p>
          <h1 className={styles.titulo}>Resumen</h1>
          <p className={styles.descripcion}>El estado de tu inventario y actividad de hoy.</p>
        </div>
      </header>

      <section className={styles.metricas} aria-label="Indicadores del inventario">
        {metricas.map((metrica) => (
          <article className={styles.metrica} key={metrica.etiqueta}>
            <span className={styles.metricaEtiqueta}>{metrica.etiqueta}</span>
            <strong className={styles.metricaValor}>{metrica.valor}</strong>
          </article>
        ))}
      </section>

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
      </nav>

      <footer className={styles.pie}>
        <span>Stockly · Gestión de inventario</span>
        <span>Panel actualizado en tiempo real al cargar la página</span>
      </footer>
    </>
  );
}
