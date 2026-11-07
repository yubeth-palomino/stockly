import { exigirDueno } from '@/lib/auth/sesion';
import { ajustarExistenciasComercial } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaAjusteComercial } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function ajustarInventario(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaAjusteComercial);
  return responderOk(await ajustarExistenciasComercial(datos, usuario.id));
}

export const POST = conManejoDeErrores(ajustarInventario);
