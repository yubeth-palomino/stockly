import { createAdminClient } from '@/lib/supabase/admin';

export type UsuarioRecuperacion = {
  id: string;
  email: string | null;
};

export type TokenRecuperacion = {
  id: string;
  usuario_id: string;
};

export async function buscarUsuarioPorEmail(email: string): Promise<UsuarioRecuperacion | null> {
  const { data, error } = await createAdminClient()
    .from('users')
    .select('id, email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function contarSolicitudesRecuperacion(usuarioId: string): Promise<number> {
  const { data, error } = await createAdminClient().rpc('contar_solicitudes_restab', {
    p_usuario_id: usuarioId,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function invalidarTokensPendientes(usuarioId: string): Promise<void> {
  const { error } = await createAdminClient().rpc('invalidar_tokens_restab', {
    p_usuario_id: usuarioId,
  });

  if (error) throw error;
}

export async function crearTokenRecuperacion(usuarioId: string, tokenHash: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc('crear_token_restab', {
    p_usuario_id: usuarioId,
    p_token_hash: tokenHash,
  });

  if (error) throw error;
  if (typeof data !== 'string') throw new Error('No se pudo crear el enlace de recuperación.');
  return data;
}

export async function buscarTokenVigente(tokenHash: string): Promise<TokenRecuperacion | null> {
  const { data, error } = await createAdminClient().rpc('buscar_token_restab', {
    p_token_hash: tokenHash,
  });

  if (error) throw error;
  return Array.isArray(data) ? (data[0] as TokenRecuperacion | undefined) ?? null : null;
}

export async function marcarTokenComoUsado(tokenId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('marcar_token_restab_usado', {
    p_id: tokenId,
  });

  if (error) throw error;
  return data === true;
}

export async function actualizarContrasenaUsuario(usuarioId: string, contrasena: string): Promise<void> {
  const { error } = await createAdminClient().auth.admin.updateUserById(usuarioId, { password: contrasena });

  if (error) throw error;
}