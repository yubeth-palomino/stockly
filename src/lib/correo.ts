import 'server-only';

import { getToken } from '@vercel/connect';
import { Resend } from 'resend';

type DatosCorreo = {
  para: string;
  asunto: string;
  html: string;
};

type ResultadoCorreo = { ok: true; id: string } | { ok: false; error: string };

export async function obtenerClaveResend(): Promise<string> {
  const claveConfigurada = process.env.RESEND_API_KEY?.trim();
  if (claveConfigurada) return claveConfigurada;
  return getToken('stockly', { subject: { type: 'app' } });
}

function obtenerRemitente(): string {
  const remitenteConfigurado = process.env.RESEND_FROM?.trim();
  if (remitenteConfigurado) return remitenteConfigurado;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Configura RESEND_FROM con un remitente de un dominio verificado en Resend.');
  }

  return 'onboarding@resend.dev';
}

export async function enviarCorreo({ para, asunto, html }: DatosCorreo): Promise<ResultadoCorreo> {
  try {
    const clave = await obtenerClaveResend();
    const resend = new Resend(clave);
    const { data, error } = await resend.emails.send({
      from: obtenerRemitente(),
      to: para,
      subject: asunto,
      html,
    });

    if (error) return { ok: false, error: error.message || 'No se pudo enviar el correo.' };
    if (!data?.id) return { ok: false, error: 'El proveedor no confirmó el envío del correo.' };
    return { ok: true, id: data.id };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar el correo.';
    return { ok: false, error: mensaje };
  }
}