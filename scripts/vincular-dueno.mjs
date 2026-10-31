import { crearClienteBaseDatos } from './db-client.mjs';

const [authRef, nombreIngresado, ...argumentosExtra] = process.argv.slice(2);
const authRefValido =
  typeof authRef === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authRef);
const nombre = nombreIngresado?.trim();

if (
  argumentosExtra.length > 0 ||
  !authRefValido ||
  !nombre ||
  nombre.length < 2 ||
  nombre.length > 120
) {
  console.error('Uso: npm run db:vincular-dueno -- "<UUID de Supabase Auth>" "<Nombre del dueño>"');
  process.exitCode = 1;
} else {
  const cliente = crearClienteBaseDatos();
  const usuario = `dueno_${authRef.replaceAll('-', '').slice(0, 12)}`;

  try {
    await cliente.connect();
    await cliente.query(
      `INSERT INTO usuarios (auth_ref, nombre, usuario, rol, activo)
       VALUES ($1, $2, $3, 'dueno', true)
       ON CONFLICT (auth_ref) DO UPDATE
       SET nombre = EXCLUDED.nombre, rol = 'dueno', activo = true`,
      [authRef, nombre, usuario],
    );
    console.log('Cuenta vinculada como dueño de Stockly.');
  } catch (error) {
    console.error('No fue posible vincular el dueño:', error);
    process.exitCode = 1;
  } finally {
    await cliente.end().catch((error) => {
      console.error('No se pudo cerrar la conexión de base de datos:', error);
      process.exitCode = 1;
    });
  }
}
