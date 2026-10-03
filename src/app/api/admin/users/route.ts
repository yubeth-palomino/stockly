import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-authorization';
import { createUserInputSchema } from '@/lib/user-validation';

export async function GET() {
  const access = await requireAdmin();
  if ('response' in access) return access.response;

  const { data, error } = await access.admin
    .from('users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'No se pudo cargar la lista de usuarios.' }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if ('response' in access) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  const parsed = createUserInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa el correo, nombre y contraseña (mínimo 12 caracteres).' }, { status: 400 });
  }

  const { email, fullName, password } = parsed.data;
  const { data, error } = await access.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    const status = error?.code === 'email_exists' ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? 'Ya existe un usuario con ese correo.' : 'No se pudo crear el usuario.' }, { status });
  }

  const { data: profile, error: profileError } = await access.admin
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await access.admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: 'No se creó el perfil del usuario.' }, { status: 500 });
  }

  return NextResponse.json({ user: profile }, { status: 201 });
}