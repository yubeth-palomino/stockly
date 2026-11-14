import { exigirDueno } from '@/lib/auth/sesion';
import { listarAbonos, registrarAbono } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaAbono } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function obtenerAbonos(request: Request) {
  const usuario = await exigirDueno();
  const cuentaId = z.string().uuid().parse(new URL(request.url).searchParams.get('cuentaId'));
  return responderOk(await listarAbonos(cuentaId, usuario.rol));
}

async function crearAbono(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaAbono);
  return responderOk(await registrarAbono(datos, usuario.id, usuario.rol), 201);
}

export const GET = conManejoDeErrores(obtenerAbonos);
export const POST = conManejoDeErrores(crearAbono);
