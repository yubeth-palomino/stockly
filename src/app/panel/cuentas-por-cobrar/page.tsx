import { redirect } from 'next/navigation';
import { CuentasPorCobrarPanel } from '@/components/panel/CuentasPorCobrarPanel';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';

export const dynamic = 'force-dynamic';

export default async function CuentasPorCobrarPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');
  if (usuario.rol !== 'dueno') redirect('/panel');

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Finanzas</p>
          <h1 className={styles.titulo}>Cuentas por cobrar</h1>
          <p className={styles.descripcion}>
            Saldos derivados de ventas a crédito y abonos inmutables con trazabilidad.
          </p>
        </div>
      </header>
      <CuentasPorCobrarPanel />
    </>
  );
}
