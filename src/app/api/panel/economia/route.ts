import { exigirDueno } from '@/lib/auth/sesion';
import { obtenerEconomia } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { esquemaFiltrosEconomia } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerDatosEconomicos(request: Request) {
  await exigirDueno();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = esquemaFiltrosEconomia.parse(parametros);
  const filtros = parsed.marca === undefined ? {} : { marca: parsed.marca };
  return responderOk(await obtenerEconomia(filtros));
}

export const GET = conManejoDeErrores(obtenerDatosEconomicos);
