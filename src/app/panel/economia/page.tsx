import { redirect } from 'next/navigation';
import { TarjetasEconomia } from '@/components/panel/TarjetasEconomia';
import { obtenerEconomia } from '@/lib/dataService';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { esquemaFiltrosEconomia } from '@/lib/validacion/esquemas';
import styles from '@/components/panel/panel.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EconomiaPage({ searchParams }: Props) {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');
  if (usuario.rol !== 'dueno') redirect('/panel');
  const parsed = esquemaFiltrosEconomia.parse(await searchParams);
  const filtros = parsed.marca === undefined ? {} : { marca: parsed.marca };
  const economia = await obtenerEconomia(filtros);

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Solo dueño</p>
          <h1 className={styles.titulo}>Economía</h1>
          <p className={styles.descripcion}>
            Inversión y ganancia potencial con los costos registrados. La ganancia realizada
            requiere una empresa autorizada y costos históricos por venta.
          </p>
        </div>
      </header>
      <form className={styles.filtrosEconomia} action="/panel/economia" method="get">
        <label htmlFor="filtro-marca-economia">Filtrar por marca</label>
        <input
          id="filtro-marca-economia"
          name="marca"
          defaultValue={filtros.marca ?? ''}
          maxLength={80}
        />
        <button type="submit">Filtrar</button>
      </form>
      <TarjetasEconomia economia={economia} />
    </>
  );
}
