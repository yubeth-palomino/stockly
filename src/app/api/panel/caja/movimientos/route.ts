import { exigirDueno } from '@/lib/auth/sesion';
import { registrarMovimientoCaja } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaMovimientoCaja } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function crearMovimiento(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaMovimientoCaja);
  return responderOk(await registrarMovimientoCaja(datos, usuario.id, usuario.rol), 201);
}

export const POST = conManejoDeErrores(crearMovimiento);
