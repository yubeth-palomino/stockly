import { exigirDueno } from '@/lib/auth/sesion';
import { abrirCaja, listarHistorialCajas, obtenerCajaActual } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaAperturaCaja } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerCaja() {
  const usuario = await exigirDueno();
  const [actual, historial] = await Promise.all([
    obtenerCajaActual(usuario.rol),
    listarHistorialCajas(usuario.rol),
  ]);
  return responderOk({ actual, historial });
}

async function crearCaja(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaAperturaCaja);
  return responderOk(await abrirCaja(datos, usuario.id, usuario.rol), 201);
}

export const GET = conManejoDeErrores(obtenerCaja);
export const POST = conManejoDeErrores(crearCaja);
