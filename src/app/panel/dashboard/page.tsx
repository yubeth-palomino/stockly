import { redirect } from 'next/navigation';
import { DashboardComercialPanel } from '@/components/panel/DashboardComercialPanel';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';

export const dynamic = 'force-dynamic';

export default async function DashboardComercialPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');
  if (usuario.rol !== 'dueno') redirect('/panel');

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Análisis de negocio</p>
          <h1 className={styles.titulo}>Dashboard comercial</h1>
          <p className={styles.descripcion}>
            Ventas, dinero recibido, saldos pendientes e inventario, sin confundir ingresos con
            utilidad.
          </p>
        </div>
      </header>
      <DashboardComercialPanel />
    </>
  );
}
