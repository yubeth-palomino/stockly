import { NextResponse } from 'next/server';
import { z } from 'zod';
import { enviarCorreo } from '@/lib/correo';
import {
  buscarUsuarioPorEmail,
  contarSolicitudesRecuperacion,
  crearTokenRecuperacion,
  invalidarTokensPendientes,
} from '@/lib/dataService';
import { plantillaRecuperacion } from '@/lib/plantillasCorreo';
import { calcularHashToken, generarToken } from '@/lib/tokenRecuperacion';
import { obtenerUrlBase } from '@/lib/urlBase';

const esquemaSolicitud = z.object({ email: z.string().trim().email().toLowerCase() });
const mensajeExito = 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.';

function registrarErrorRecuperacion(error: unknown) {
  const mensaje = error instanceof Error ? error.message : 'Error desconocido.';
  const mensajeSeguro = mensaje.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo]');
  console.error('[auth/recuperar] No se pudo completar la solicitud.', mensajeSeguro);
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'La solicitud no contiene JSON válido.' }, { status: 400 });
  }

  const validacion = esquemaSolicitud.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json({ error: 'Ingresa un correo electrónico válido.' }, { status: 400 });
  }

  try {
    const usuario = await buscarUsuarioPorEmail(validacion.data.email);
    if (usuario) {
      const solicitudes = await contarSolicitudesRecuperacion(usuario.id);
      if (solicitudes < 3) {
        await invalidarTokensPendientes(usuario.id);
        const token = generarToken();
        await crearTokenRecuperacion(usuario.id, calcularHashToken(token));
        const enlace = `${obtenerUrlBase()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;

        const resultadoCorreo = await enviarCorreo({
          para: validacion.data.email,
          asunto: 'Restablecer contraseña',
          html: plantillaRecuperacion(enlace),
        });

        if (!resultadoCorreo.ok) {
          registrarErrorRecuperacion(new Error(resultadoCorreo.error));
          await invalidarTokensPendientes(usuario.id);
        }
      }
    }
  } catch (error) {
    registrarErrorRecuperacion(error);
  }

  return NextResponse.json({ message: mensajeExito }, { status: 200 });
}