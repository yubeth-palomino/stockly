import { redirect } from 'next/navigation';
import { DirectorioComercial } from '@/components/panel/DirectorioComercial';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');
  if (usuario.rol !== 'dueno') redirect('/panel');

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Administración</p>
          <h1 className={styles.titulo}>Clientes</h1>
          <p className={styles.descripcion}>
            Consulta contactos e historial de saldos pendientes, visible solo para el dueño.
          </p>
        </div>
      </header>
      <DirectorioComercial tipo="clientes" />
    </>
  );
}
