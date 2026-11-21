import { conTransaccion, consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { createAdminClient } from '@/lib/supabase/admin';
import { enviarCorreo } from '@/lib/correo';
import { plantillaInvitacion } from '@/lib/plantillasCorreo';
import { obtenerUrlBase } from '@/lib/urlBase';
import type {
  CambiosUsuario,
  DatosUsuario,
  DatosUsuarioVinculado,
  FilaUsuario,
} from '@/lib/datos/tipos';

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
  if (
    esErrorPostgres(error) &&
    error.code === '23505' &&
    error.constraint === 'usuarios_auth_ref_key'
  ) {
    throw new ErrorDeNegocio(
      'USUARIO_DUPLICADO',
      'Esta cuenta de Supabase Auth ya está vinculada a Stockly.',
    );
  }
  throw error;
}

export async function obtenerUsuarioActual() {
  return obtenerUsuario();
}

export async function listarUsuarios(empresaId: string): Promise<FilaUsuario[]> {
  return consultar<FilaUsuario>(
    `SELECT id, nombre, usuario, rol, activo, created_at::text AS "createdAt"
     FROM usuarios
     WHERE empresa_id = $1
     ORDER BY nombre ASC, id ASC`,
    [empresaId],
  );
}

export async function crearUsuarioVinculado(
  datos: DatosUsuarioVinculado,
  empresaId: string,
): Promise<{ id: string }> {
  try {
    return await conTransaccion(async (tx) => {
      const sucursales = await tx.query<FilaId>(
        `SELECT id FROM public.sucursales
         WHERE empresa_id = $1 AND activa = true
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
        [empresaId],
      );
      const sucursalId = sucursales.rows[0]?.id;
      if (!sucursalId) throw new Error('El negocio no tiene una sucursal activa.');

      const filas = await tx.query<FilaId>(
        `INSERT INTO usuarios (nombre, usuario, rol, auth_ref, empresa_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [datos.nombre.trim(), datos.usuario.trim().toLowerCase(), datos.rol, datos.authRef, empresaId],
      );
      const fila = filas.rows[0];
      if (!fila) throw new Error('La base de datos no devolvió el usuario recién creado.');

      await tx.query(
        `INSERT INTO public.empresas_usuarios
           (empresa_id, usuario_id, rol, alcance_sucursales, activo)
         VALUES ($1, $2, $3, $4, true)`,
        [empresaId, fila.id, datos.rol, datos.rol === 'dueno' ? 'todas' : 'asignadas'],
      );
      await tx.query(
        `INSERT INTO public.usuarios_sucursales (empresa_id, usuario_id, sucursal_id)
         VALUES ($1, $2, $3)`,
        [empresaId, fila.id, sucursalId],
      );

      return { id: fila.id };
    });
  } catch (error) {
    return traducirErrorUsuario(error);
  }
}

export async function crearUsuario(
  datos: DatosUsuario,
  empresaId: string,
): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data: invitacion, error: errorInvitacion } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: datos.correo,
    options: {
      data: { full_name: datos.nombre.trim() },
      redirectTo: new URL('/auth/confirm', obtenerUrlBase()).toString(),
    },
  });

  if (errorInvitacion) {
    if (errorInvitacion.code === 'email_exists') {
      throw new ErrorDeNegocio(
        'USUARIO_DUPLICADO',
        'Ya existe una cuenta de acceso con ese correo.',
      );
    }
    throw errorInvitacion;
  }

  const authId = invitacion.user.id;
  const enlace = invitacion.properties.action_link;

  try {
    const fila = await conTransaccion(async (tx) => {
      const sucursales = await tx.query<FilaId>(
        `SELECT id FROM public.sucursales
         WHERE empresa_id = $1 AND activa = true
         ORDER BY created_at ASC, id ASC
         LIMIT 1`,
        [empresaId],
      );
      const sucursalId = sucursales.rows[0]?.id;
      if (!sucursalId) throw new Error('El negocio no tiene una sucursal activa.');

      const usuarios = await tx.query<FilaId>(
        `INSERT INTO usuarios (nombre, usuario, rol, auth_ref, empresa_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [datos.nombre.trim(), datos.usuario.trim().toLowerCase(), datos.rol, authId, empresaId],
      );
      const usuario = usuarios.rows[0];
      if (!usuario) throw new Error('La base de datos no devolvió el usuario recién creado.');

      await tx.query(
        `INSERT INTO public.empresas_usuarios
           (empresa_id, usuario_id, rol, alcance_sucursales, activo)
         VALUES ($1, $2, $3, $4, true)`,
        [empresaId, usuario.id, datos.rol, datos.rol === 'dueno' ? 'todas' : 'asignadas'],
      );
      await tx.query(
        `INSERT INTO public.usuarios_sucursales (empresa_id, usuario_id, sucursal_id)
         VALUES ($1, $2, $3)`,
        [empresaId, usuario.id, sucursalId],
      );
      return usuario;
    });

    const resultadoCorreo = await enviarCorreo({
      para: datos.correo,
      asunto: 'Invitación para acceder a Stockly',
      html: plantillaInvitacion(datos.nombre.trim(), enlace),
    });
    if (!resultadoCorreo.ok) {
      throw new ErrorDeNegocio('ERROR_INTERNO', resultadoCorreo.error);
    }

    return { id: fila.id };
  } catch (error) {
    try {
      await conTransaccion(async (tx) => {
        await tx.query(
          `DELETE FROM public.usuarios_sucursales
           WHERE usuario_id IN (
             SELECT id FROM public.usuarios WHERE auth_ref = $1 AND empresa_id = $2
           )
           AND empresa_id = $2`,
          [authId, empresaId],
        );
        await tx.query(
          `DELETE FROM public.empresas_usuarios
           WHERE usuario_id IN (
             SELECT id FROM public.usuarios WHERE auth_ref = $1 AND empresa_id = $2
           )
           AND empresa_id = $2`,
          [authId, empresaId],
        );
        await tx.query('DELETE FROM usuarios WHERE auth_ref = $1 AND empresa_id = $2', [
          authId,
          empresaId,
        ]);
      });
    } catch (errorLimpieza) {
      console.error('No se pudo revertir el perfil Stockly de una invitación fallida.', errorLimpieza);
    }

    const { error: errorEliminarAuth } = await supabase.auth.admin.deleteUser(authId);
    if (errorEliminarAuth) {
      console.error('No se pudo revertir la cuenta Auth de una invitación fallida.', errorEliminarAuth);
    }

    return traducirErrorUsuario(error);
  }
}

export async function actualizarUsuario(
  id: string,
  cambios: CambiosUsuario,
  duenoActualId: string,
  empresaId: string,
): Promise<void> {
  const campos: Array<{ columna: string; valor: string | boolean }> = [];
  if (cambios.nombre !== undefined)
    campos.push({ columna: 'nombre', valor: cambios.nombre.trim() });
  if (cambios.rol !== undefined) campos.push({ columna: 'rol', valor: cambios.rol });
  if (cambios.activo !== undefined) campos.push({ columna: 'activo', valor: cambios.activo });
  if (campos.length === 0) throw new ErrorDeNegocio('DATOS_INVALIDOS');

  try {
    await conTransaccion(async (tx) => {
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext($1), 0)`, [
        `stockly_owner_update:${empresaId}`,
      ]);
      const duenosActivos = await tx.query<FilaDuenoActivo>(
        `SELECT id FROM usuarios
         WHERE empresa_id = $1 AND rol = 'dueno' AND activo = true
         ORDER BY id
         FOR UPDATE`,
        [empresaId],
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
      valores.push(id, empresaId);
      const resultado = await tx.query(
        `UPDATE usuarios SET ${asignaciones.join(', ')}
         WHERE id = $${valores.length - 1} AND empresa_id = $${valores.length}`,
        valores,
      );

      if (resultado.rowCount === 0) throw new ErrorDeNegocio('USUARIO_NO_ENCONTRADO');
      const membership = await tx.query(
        `UPDATE public.empresas_usuarios
         SET rol = COALESCE($1, rol), activo = COALESCE($2, activo)
         WHERE usuario_id = $3 AND empresa_id = $4`,
        [cambios.rol ?? null, cambios.activo ?? null, id, empresaId],
      );
      if (membership.rowCount === 0) throw new ErrorDeNegocio('USUARIO_NO_ENCONTRADO');
    });
  } catch (error) {
    traducirErrorUsuario(error);
  }
}
