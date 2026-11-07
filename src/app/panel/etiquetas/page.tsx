import { SelectorEtiquetas } from '@/components/panel/SelectorEtiquetas';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { listarInventario } from '@/lib/dataService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ id?: string | string[] }>;
};

export default async function EtiquetasPage({ searchParams }: Props) {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No se encontró el usuario Stockly autenticado.');

  const parametros = await searchParams;
  const candidato = typeof parametros.id === 'string' ? parametros.id : undefined;
  const productoInicial = candidato && z.string().uuid().safeParse(candidato).success
    ? candidato
    : undefined;
  const productos = await listarInventario({}, usuario.rol);

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Inventario</p>
          <h1 className={styles.titulo}>Etiquetas de productos</h1>
          <p className={styles.descripcion}>
            Selecciona prendas para imprimir etiquetas individuales o una hoja A4.
          </p>
        </div>
      </header>
      <SelectorEtiquetas
        productos={productos}
        {...(productoInicial ? { productoInicial } : {})}
      />
    </>
  );
}
