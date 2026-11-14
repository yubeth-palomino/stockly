import { exigirDueno } from '@/lib/auth/sesion';
import { listarCuentasPorCobrar } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';
import { esquemaFiltrosCuentas } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerCuentas(request: Request) {
  const usuario = await exigirDueno();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filtros = esquemaFiltrosCuentas.parse(parametros);
  return responderOk(await listarCuentasPorCobrar(filtros, hoyBogota(), usuario.rol));
}

export const GET = conManejoDeErrores(obtenerCuentas);
