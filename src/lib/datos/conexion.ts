import { obtenerPool } from '@/lib/db/conexion';

export async function cerrarPool(): Promise<void> {
  await obtenerPool().end();
}
