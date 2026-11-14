import { notFound, redirect } from 'next/navigation';
import { DetalleClientePanel } from '@/components/panel/DetalleClientePanel';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export default async function DetalleClientePage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');
  if (usuario.rol !== 'dueno') redirect('/panel');
  const { id } = await params;
  const idValido = z.string().uuid().safeParse(id);
  if (!idValido.success) notFound();

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Administración</p>
          <h1 className={styles.titulo}>Historial del cliente</h1>
          <p className={styles.descripcion}>Ventas, pagos y saldos asociados a este cliente.</p>
        </div>
      </header>
      <DetalleClientePanel id={idValido.data} />
    </>
  );
}
