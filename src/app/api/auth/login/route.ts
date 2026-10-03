import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Correo o contraseña incorrectos.' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut({ scope: 'local' });
    return NextResponse.json(
      { error: 'No se encontró el perfil en Supabase. Aplica la migración de users y vuelve a intentar.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ user: profile });
}