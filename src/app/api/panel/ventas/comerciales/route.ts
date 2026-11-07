import { exigirUsuario } from '@/lib/auth/sesion';
import { registrarVentaComercial } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaVentaComercial } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function crearVenta(request: Request) {
  const usuario = await exigirUsuario();
  const datos = await leerCuerpo(request, esquemaVentaComercial);
  return responderOk(await registrarVentaComercial(datos, usuario.id), 201);
}

export const POST = conManejoDeErrores(crearVenta);
