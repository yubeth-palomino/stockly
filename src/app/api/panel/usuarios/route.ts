import { exigirDueno } from '@/lib/auth/sesion';
import { crearUsuario, listarUsuarios } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaUsuario } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerUsuarios() {
  await exigirDueno();
  return responderOk(await listarUsuarios());
}

async function crearUsuarioHandler(request: Request) {
  await exigirDueno();
  const datos = await leerCuerpo(request, esquemaUsuario);
  return responderOk(await crearUsuario(datos), 201);
}

export const GET = conManejoDeErrores(obtenerUsuarios);
export const POST = conManejoDeErrores(crearUsuarioHandler);
