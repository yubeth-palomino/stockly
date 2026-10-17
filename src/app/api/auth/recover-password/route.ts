import { NextResponse } from 'next/server';
import { recoverPasswordInputSchema } from '@/lib/user-validation';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 });
  }

  const parsed = recoverPasswordInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ingresa un correo electrónico válido.' }, { status: 400 });
  }

  const supabase = await createClient();
  const redirectTo = new URL('/auth/confirm', request.url).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  if (error) {
    return NextResponse.json(
      { error: 'No se pudo solicitar el correo de recuperación. Intenta nuevamente.' },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Si existe una cuenta asociada, recibirás un correo con instrucciones.',
  });
}
