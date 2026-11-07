import { FormularioProducto } from '@/components/panel/FormularioProducto';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';

export default async function NuevaEntradaPage() {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No se encontró el usuario Stockly autenticado.');
  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Inventario</p>
          <h1 className={styles.titulo}>Registrar entrada de mercancía</h1>
          <p className={styles.descripcion}>
            Registra nuevos productos o suma unidades a una referencia y talla existentes.
          </p>
        </div>
      </header>
      <FormularioProducto rol={usuario.rol} />
    </>
  );
}
