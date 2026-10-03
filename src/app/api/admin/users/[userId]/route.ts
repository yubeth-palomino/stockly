import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/admin-authorization';
import { updateUserInputSchema } from '@/lib/user-validation';

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireAdmin();
  if ('response' in access) return access.response;

  const { userId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  const parsed = updateUserInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa el correo, nombre, rol y contraseña.' }, { status: 400 });
  }

  const { email, fullName, role, password } = parsed.data;
  if (access.userId === userId && role !== 'admin') {
    return NextResponse.json({ error: 'No puedes quitarte tu propio rol de administrador.' }, { status: 409 });
  }

  const { data: existingUser, error: lookupError } = await access.admin
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: 'No se pudo consultar el usuario.' }, { status: 500 });
  if (!existingUser) return NextResponse.json({ error: 'No se encontró el usuario.' }, { status: 404 });

  if (existingUser.role === 'admin' && role === 'user') {
    const { count, error: countError } = await access.admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) return NextResponse.json({ error: 'No se pudo validar el rol.' }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Debe quedar al menos un administrador.' }, { status: 409 });
    }
  }

  const { error: authError } = await access.admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    ...(password ? { password } : {}),
  });

  if (authError) {
    const status = authError.code === 'email_exists' ? 409 : 400;
    return NextResponse.json({ error: status === 409 ? 'Ya existe un usuario con ese correo.' : 'No se pudo actualizar la cuenta.' }, { status });
  }

  const { data: profile, error: profileError } = await access.admin
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select('id, email, full_name, role, created_at')
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'La cuenta se actualizó, pero no se pudo actualizar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ user: profile });
}