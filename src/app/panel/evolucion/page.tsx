import { redirect } from 'next/navigation';
import { EvolucionVentasPanel } from '@/components/panel/EvolucionVentasPanel';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { obtenerEvolucionVentas } from '@/lib/dataService';
import { hoyBogota } from '@/lib/reglas/fechas';
import { esquemaFiltrosEvolucion } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EvolucionPage({ searchParams }: Props) {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');

  const filtros = esquemaFiltrosEvolucion.parse(await searchParams);
  const datos = await obtenerEvolucionVentas(
    {
      rango: filtros.rango,
      agrupacion: filtros.agrupacion,
      ...(filtros.desde ? { desde: filtros.desde } : {}),
      ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
    },
    usuario.rol,
    hoyBogota(),
  );

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Ventas e inventario</p>
          <h1 className={styles.titulo}>Evolución de ventas</h1>
          <p className={styles.descripcion}>
            Ingresos y unidades agregados desde los registros de ventas.
          </p>
        </div>
      </header>
      <EvolucionVentasPanel datos={datos} />
    </>
  );
}
