import { pool } from '@/lib/db/conexion';

export async function cerrarPool(): Promise<void> {
  await pool.end();
}
