import { Aviso } from '@/components/ui/Aviso';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { FormularioUsuario } from '@/components/panel/FormularioUsuario';
import { TablaUsuarios } from '@/components/panel/TablaUsuarios';
import styles from '@/components/panel/panel.module.css';
import { exigirDueno } from '@/lib/auth/sesion';
import { listarUsuarios } from '@/lib/dataService';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const duenoActual = await exigirDueno();
  const usuarios = await listarUsuarios();
  const duenosActivos = usuarios.filter((usuario) => usuario.rol === 'dueno' && usuario.activo).length;

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Administración</p>
          <h1 className={styles.titulo}>Usuarios</h1>
          <p className={styles.descripcion}>Administra las cuentas y sus permisos dentro de Stockly.</p>
        </div>
      </header>
      <FormularioUsuario />
      <section className={styles.seccionResumen}>
        <h2>Cuentas vinculadas</h2>
        {duenosActivos === 0 && (
          <Aviso tipo="error" titulo="No hay dueños activos">
            Revisa las cuentas de autenticación y registra un dueño antes de continuar.
          </Aviso>
        )}
        {usuarios.length === 0 ? (
          <EstadoVacio titulo="No hay usuarios registrados" />
        ) : (
          <TablaUsuarios
            usuarios={usuarios}
            duenoActualId={duenoActual.id}
            duenosActivos={duenosActivos}
          />
        )}
      </section>
    </>
  );
}
