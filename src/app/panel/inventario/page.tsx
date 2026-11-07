import Link from 'next/link';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Aviso } from '@/components/ui/Aviso';
import { FiltrosInventario } from '@/components/panel/FiltrosInventario';
import { TablaInventario } from '@/components/panel/TablaInventario';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { listarInventario } from '@/lib/dataService';
import { esquemaFiltrosInventario } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InventarioPage({ searchParams }: Props) {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No se encontró el usuario Stockly autenticado.');
  const parametros = await searchParams;
  const parsed = esquemaFiltrosInventario.parse(parametros);
  const filtros = {
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.marca !== undefined ? { marca: parsed.marca } : {}),
    ...(parsed.talla !== undefined ? { talla: parsed.talla } : {}),
    ...(parsed.soloDisponibles !== undefined ? { soloDisponibles: parsed.soloDisponibles } : {}),
  };
  const productos = await listarInventario(filtros, usuario.rol);

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Existencias</p>
          <h1 className={styles.titulo}>Inventario</h1>
          <p className={styles.descripcion}>Busca productos y consulta su disponibilidad actual.</p>
        </div>
        <Link className={styles.botonEnlace} href="/panel/inventario/nuevo">
          Registrar entrada
        </Link>
      </header>
      <FiltrosInventario filtros={filtros} />
      {productos.length === 0 ? (
        <EstadoVacio titulo="No se encontraron productos con esos filtros">
          Ajusta los filtros o registra una nueva entrada de mercancía.
        </EstadoVacio>
      ) : (
        <>
          {productos.length >= LIMITE_LISTADO && (
            <Aviso tipo="advertencia" titulo="Límite de resultados">
              Se muestran los primeros {LIMITE_LISTADO} productos. Usa los filtros para acotar la búsqueda.
            </Aviso>
          )}
          <TablaInventario productos={productos} rol={usuario.rol} />
        </>
      )}
    </>
  );
}
