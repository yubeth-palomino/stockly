import { exigirUsuario } from '@/lib/auth/sesion';
import { responderOk, conManejoDeErrores } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

async function obtenerSesion() {
  const usuario = await exigirUsuario();
  return responderOk({ nombre: usuario.nombre, rol: usuario.rol });
}

export const GET = conManejoDeErrores(obtenerSesion);
