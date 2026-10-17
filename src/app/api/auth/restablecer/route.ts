import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  actualizarContrasenaUsuario,
  buscarTokenVigente,
  invalidarTokensPendientes,
  marcarTokenComoUsado,
} from '@/lib/dataService';
import { calcularHashToken } from '@/lib/tokenRecuperacion';

const esquemaSolicitud = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/i).transform((token) => token.toLowerCase()),
    contrasena: z.string().min(8),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden.',
  });

const mensajeEnlaceInvalido = 'El enlace no es válido o ya venció.';

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'La solicitud no contiene JSON válido.' }, { status: 400 });
  }

  const validacion = esquemaSolicitud.safeParse(cuerpo);
  if (!validacion.success) {
    const errorConfirmacion = validacion.error.issues.find((problema) => problema.path[0] === 'confirmacion');
    return NextResponse.json(
      { error: errorConfirmacion?.message ?? 'El enlace o la contraseña no tienen un formato válido.' },
      { status: 400 },
    );
  }

  try {
    const registro = await buscarTokenVigente(calcularHashToken(validacion.data.token));
    if (!registro) return NextResponse.json({ error: mensajeEnlaceInvalido }, { status: 400 });

    const consumido = await marcarTokenComoUsado(registro.id);
    if (!consumido) return NextResponse.json({ error: mensajeEnlaceInvalido }, { status: 400 });

    await actualizarContrasenaUsuario(registro.usuario_id, validacion.data.contrasena);
    await invalidarTokensPendientes(registro.usuario_id);
    return NextResponse.json({ message: 'La contraseña se actualizó correctamente.' }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar la contraseña. Solicita un enlace nuevo.' },
      { status: 500 },
    );
  }
}