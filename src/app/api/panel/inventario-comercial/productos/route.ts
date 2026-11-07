import { exigirDueno } from '@/lib/auth/sesion';
import { crearProductoComercial } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaCrearProductoComercial } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function crearProducto(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaCrearProductoComercial);
  return responderOk(await crearProductoComercial(datos, usuario.id), 201);
}

export const POST = conManejoDeErrores(crearProducto);
