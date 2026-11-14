import { redirect } from 'next/navigation';
import { FormularioVenta } from '@/components/panel/FormularioVenta';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';

export default async function NuevaVentaPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) redirect('/login');

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Ventas</p>
          <h1 className={styles.titulo}>Registrar venta</h1>
          <p className={styles.descripcion}>
            Busca un producto disponible, indica la cantidad y confirma la operación.
          </p>
        </div>
      </header>
      <FormularioVenta rol={usuario.rol} />
    </>
  );
}
