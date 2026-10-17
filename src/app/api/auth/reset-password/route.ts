import { NextResponse } from 'next/server';
import { resetPasswordInputSchema } from '@/lib/user-validation';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  const parsed = resetPasswordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'La contraseña debe tener entre 12 y 128 caracteres.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json(
      { error: 'El enlace de recuperación no es válido o venció. Solicita uno nuevo.' },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return NextResponse.json(
      { error: 'No se pudo cambiar la contraseña. Solicita un enlace nuevo.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
