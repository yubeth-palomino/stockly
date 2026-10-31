import { createClient } from '@/lib/supabase/server';
import { consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import type { Rol } from '@/lib/reglas/roles';

export type UsuarioSesion = {
  id: string;
  nombre: string;
  rol: Rol;
};

type FilaUsuarioSesion = {
  id: string;
  nombre: string;
  rol: string;
};

export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const clienteSupabase = await createClient();
  const { data, error } = await clienteSupabase.auth.getUser();

  if (error && error.name !== 'AuthSessionMissingError') throw error;
  if (error || !data.user) return null;

  const usuarios = await consultar<FilaUsuarioSesion>(
    `SELECT id, nombre, rol
     FROM usuarios
     WHERE auth_ref = $1 AND activo = true
     LIMIT 1`,
    [data.user.id],
  );
  const usuario = usuarios[0];

  if (!usuario) {
    console.warn('La cuenta autenticada existe, pero no está dada de alta en Stockly.');
    return null;
  }

  if (usuario.rol !== 'dueno' && usuario.rol !== 'trabajador') {
    throw new Error('La fila del usuario contiene un rol Stockly no válido.');
  }

  return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
}

export async function exigirUsuario(): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new ErrorDeNegocio('NO_AUTORIZADO');
  return usuario;
}

export async function exigirDueno(): Promise<UsuarioSesion> {
  const usuario = await exigirUsuario();
  if (usuario.rol !== 'dueno') throw new ErrorDeNegocio('SIN_PERMISO');
  return usuario;
}
