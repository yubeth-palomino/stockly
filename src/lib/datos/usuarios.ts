import { conTransaccion, consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { obtenerUsuario } from '@/lib/auth/sesion';
import type { CambiosUsuario, DatosUsuario, FilaUsuario } from '@/lib/datos/tipos';

type FilaId = { id: string };
type FilaDuenoActivo = { id: string };
type ErrorPostgres = { code?: string; constraint?: string };

function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function traducirErrorUsuario(error: unknown): never {
  if (
    esErrorPostgres(error) &&
    error.code === '23505' &&
    error.constraint === 'ux_usuarios_usuario'
  ) {
    throw new ErrorDeNegocio('USUARIO_DUPLICADO');
  }
  throw error;
}

export async function obtenerUsuarioActual() {
  return obtenerUsuario();
}

export async function listarUsuarios(): Promise<FilaUsuario[]> {
  return consultar<FilaUsuario>(
    `SELECT id, nombre, usuario, rol, activo, created_at::text AS "createdAt"
     FROM usuarios
     ORDER BY nombre ASC, id ASC`,
  );
}

export async function crearUsuario(datos: DatosUsuario): Promise<{ id: string }> {
  try {
    const filas = await consultar<FilaId>(
      `INSERT INTO usuarios (nombre, usuario, rol, auth_ref)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [datos.nombre.trim(), datos.usuario.trim().toLowerCase(), datos.rol, datos.authRef],
    );
    const fila = filas[0];
    if (!fila) throw new Error('La base de datos no devolvió el usuario recién creado.');
    return { id: fila.id };
  } catch (error) {
    return traducirErrorUsuario(error);
  }
}

export async function actualizarUsuario(
  id: string,
  cambios: CambiosUsuario,
  duenoActualId: string,
): Promise<void> {
  const campos: Array<{ columna: string; valor: string | boolean }> = [];
  if (cambios.nombre !== undefined)
    campos.push({ columna: 'nombre', valor: cambios.nombre.trim() });
  if (cambios.rol !== undefined) campos.push({ columna: 'rol', valor: cambios.rol });
  if (cambios.activo !== undefined) campos.push({ columna: 'activo', valor: cambios.activo });
  if (campos.length === 0) throw new ErrorDeNegocio('DATOS_INVALIDOS');

  try {
    await conTransaccion(async (tx) => {
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext('stockly_owner_update'), 0)`);
      const duenosActivos = await tx.query<FilaDuenoActivo>(
        `SELECT id FROM usuarios
         WHERE rol = 'dueno' AND activo = true
         ORDER BY id
         FOR UPDATE`,
      );
      if (!duenosActivos.rows.some((dueno) => dueno.id === duenoActualId)) {
        throw new ErrorDeNegocio('SIN_PERMISO');
      }
      const esDuenoActivo = duenosActivos.rows.some((dueno) => dueno.id === id);
      const seRetiraComoDueno = cambios.rol === 'trabajador' || cambios.activo === false;

      if (esDuenoActivo && seRetiraComoDueno && duenosActivos.rowCount === 1) {
        throw new ErrorDeNegocio('ULTIMO_DUENO');
      }

      const valores: Array<string | boolean> = [];
      const asignaciones = campos.map(({ columna, valor }) => {
        valores.push(valor);
        return `${columna} = $${valores.length}`;
      });
      valores.push(id);
      const resultado = await tx.query(
        `UPDATE usuarios SET ${asignaciones.join(', ')}
         WHERE id = $${valores.length}`,
        valores,
      );

      if (resultado.rowCount === 0) throw new ErrorDeNegocio('USUARIO_NO_ENCONTRADO');
    });
  } catch (error) {
    traducirErrorUsuario(error);
  }
}
