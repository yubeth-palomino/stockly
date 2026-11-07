import Link from 'next/link';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { FiltrosVentas } from '@/components/panel/FiltrosVentas';
import { TablaVentas } from '@/components/panel/TablaVentas';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { listarVentas } from '@/lib/dataService';
import { esquemaFiltrosVentas } from '@/lib/validacion/esquemas';
import { formatearCantidad } from '@/lib/formato';
import styles from '@/components/panel/panel.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VentasPage({ searchParams }: Props) {
  const parsed = esquemaFiltrosVentas.parse(await searchParams);
  const filtros = {
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.desde !== undefined ? { desde: parsed.desde } : {}),
    ...(parsed.hasta !== undefined ? { hasta: parsed.hasta } : {}),
  };
  const ventas = await listarVentas(filtros);
  const exportParams = new URLSearchParams();
  if (filtros.referencia) exportParams.set('referencia', filtros.referencia);
  if (filtros.desde) exportParams.set('desde', filtros.desde);
  if (filtros.hasta) exportParams.set('hasta', filtros.hasta);
  const exportQuery = exportParams.toString();

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Actividad</p>
          <h1 className={styles.titulo}>Ventas</h1>
          <p className={styles.descripcion}>Historial de ventas registradas, de la más reciente a la más antigua.</p>
        </div>
        <div className={styles.accionesPagina}>
          <Link className={styles.botonEnlace} href={`/api/panel/ventas/exportar${exportQuery ? `?${exportQuery}` : ''}`}>
            Exportar CSV
          </Link>
          <Link className={styles.botonEnlace} href="/panel/ventas/nueva">Registrar venta</Link>
        </div>
      </header>
      <FiltrosVentas filtros={filtros} />
      {ventas.length === 0 ? (
        <EstadoVacio titulo="No hay ventas registradas">
          Las ventas que registres aparecerán aquí.
        </EstadoVacio>
      ) : (
        <>
          {ventas.length >= LIMITE_LISTADO && (
            <p className={styles.textoSuave}>
              Se muestran las primeras {formatearCantidad(LIMITE_LISTADO)} ventas. Usa los filtros para acotar la búsqueda.
            </p>
          )}
          <TablaVentas ventas={ventas} />
        </>
      )}
    </>
  );
}
