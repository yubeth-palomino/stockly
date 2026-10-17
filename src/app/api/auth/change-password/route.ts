import { NextResponse } from 'next/server';
import { changePasswordInputSchema } from '@/lib/user-validation';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  const parsed = changePasswordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'La nueva contraseña debe tener entre 12 y 128 caracteres.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Tu sesión expiró. Inicia sesión nuevamente.' }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json({ error: 'No se pudo verificar la cuenta.' }, { status: 400 });
  }

  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verificationError) {
    return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: 'No se pudo cambiar la contraseña. Intenta nuevamente.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
