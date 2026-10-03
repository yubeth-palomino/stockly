import { NextResponse } from 'next/server';
import { createClient } from './server';
import { createAdminClient } from './admin';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== 'string') {
    return { response: NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    return { response: NextResponse.json({ error: 'No tienes permiso para administrar usuarios.' }, { status: 403 }) };
  }

  return { admin: createAdminClient(), userId };
}