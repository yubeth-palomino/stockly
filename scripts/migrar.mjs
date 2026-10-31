import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearClienteBaseDatos } from './db-client.mjs';

const directorio = path.dirname(fileURLToPath(import.meta.url));
const carpetaMigraciones = path.resolve(directorio, '../supabase/migrations');
const cliente = crearClienteBaseDatos();

async function perfilLoginAplicado() {
  const { rows } = await cliente.query(`
    SELECT
      to_regclass('public.users') IS NOT NULL AS existe_perfil,
      to_regclass('public.users_email_lower_uidx') IS NOT NULL AS existe_indice,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'handle_auth_user_profile'
      ) AS existe_funcion,
      EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'auth' AND c.relname = 'users'
          AND t.tgname = 'on_auth_user_profile_created' AND NOT t.tgisinternal
      ) AS existe_trigger,
      (
        SELECT count(*) = 6
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
          AND column_name IN ('id', 'email', 'full_name', 'role', 'created_at', 'updated_at')
      ) AS columnas_completas
  `);
  return Object.values(rows[0]).every(Boolean);
}

async function registrarMigracionLoginSiYaFueAplicada(archivo) {
  if (archivo !== '20261003000100_create_users_profiles.sql') return false;
  if (!(await perfilLoginAplicado())) {
    throw new Error(
      'La migración del perfil de login no está aplicada por completo; no se ejecutará automáticamente.',
    );
  }
  await cliente.query(
    'INSERT INTO _migrations (archivo) VALUES ($1) ON CONFLICT (archivo) DO NOTHING',
    [archivo],
  );
  console.log(`${archivo}: registrada como existente (sin volver a ejecutarla)`);
  return true;
}

async function main() {
  await cliente.connect();
  await cliente.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial primary key,
      archivo text unique not null,
      aplicada_en timestamptz default now()
    )
  `);

  const archivos = (await readdir(carpetaMigraciones))
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();

  for (const archivo of archivos) {
    const { rows } = await cliente.query(
      'SELECT 1 FROM _migrations WHERE archivo = $1',
      [archivo],
    );
    if (rows.length > 0) {
      console.log(`${archivo}: omitida`);
      continue;
    }

    if (await registrarMigracionLoginSiYaFueAplicada(archivo)) continue;

    const sql = await readFile(path.join(carpetaMigraciones, archivo), 'utf8');
    await cliente.query('BEGIN');
    try {
      await cliente.query(sql);
      await cliente.query('INSERT INTO _migrations (archivo) VALUES ($1)', [archivo]);
      await cliente.query('COMMIT');
      console.log(`${archivo}: aplicada`);
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    }
  }
}

try {
  await main();
} catch (error) {
  console.error('Falló la aplicación de migraciones:', error);
  process.exitCode = 1;
} finally {
  await cliente.end().catch((error) => {
    console.error('No se pudo cerrar la conexión de migraciones:', error);
    process.exitCode = 1;
  });
}
