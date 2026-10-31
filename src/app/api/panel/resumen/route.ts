import { exigirUsuario } from '@/lib/auth/sesion';
import { obtenerResumen } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

async function manejarGet() {
  const usuario = await exigirUsuario();
  return responderOk(await obtenerResumen(usuario.rol));
}

export const GET = conManejoDeErrores(manejarGet);
