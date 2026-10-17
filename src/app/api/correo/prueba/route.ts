import { NextResponse } from 'next/server';
import { z } from 'zod';
import { enviarCorreo } from '@/lib/correo';

const esquemaSolicitud = z.object({ para: z.email() });

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 });
  }

  const validacion = esquemaSolicitud.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json({ error: 'Escribe una dirección de correo válida.' }, { status: 400 });
  }

  const resultado = await enviarCorreo({
    para: validacion.data.para,
    asunto: 'Prueba de correo',
    html: '<h1>Correo de prueba</h1><p>La conexión de Stockly con Resend funciona correctamente.</p>',
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 500 });
  }

  return NextResponse.json({ mensaje: 'Correo enviado', id: resultado.id }, { status: 200 });
}