import { exigirDueno } from '@/lib/auth/sesion';
import { cerrarCaja } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaCierreCaja } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function cerrarSesionCaja(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaCierreCaja);
  return responderOk(await cerrarCaja(datos, usuario.id, usuario.rol));
}

export const POST = conManejoDeErrores(cerrarSesionCaja);
