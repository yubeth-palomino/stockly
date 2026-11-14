import { notFound, redirect } from 'next/navigation';
import { DetalleProveedorPanel } from '@/components/panel/DetalleProveedorPanel';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export default async function DetalleProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          <h1 className={styles.titulo}>Detalle del proveedor</h1>
          <p className={styles.descripcion}>
            Datos de contacto registrados, sin compras o deudas inferidas.
          </p>
        </div>
      </header>
      <DetalleProveedorPanel id={idValido.data} />
    </>
  );
}
