import { redirect } from 'next/navigation';
import { CajaPanel } from '@/components/panel/CajaPanel';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';

export const dynamic = 'force-dynamic';

export default async function CajaPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');
  if (usuario.rol !== 'dueno') redirect('/panel');

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Operación diaria</p>
          <h1 className={styles.titulo}>Caja</h1>
          <p className={styles.descripcion}>
            Apertura, ingresos, egresos y cierre. El efectivo se calcula separado de los otros
            medios.
          </p>
        </div>
      </header>
      <CajaPanel />
    </>
  );
}
