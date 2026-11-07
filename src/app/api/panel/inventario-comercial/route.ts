import { exigirUsuario } from '@/lib/auth/sesion';
import { listarInventarioComercial } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { esquemaFiltrosInventarioComercial } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerInventario(request: Request) {
  const usuario = await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filtros = esquemaFiltrosInventarioComercial.parse(parametros);
  return responderOk(await listarInventarioComercial(filtros, usuario));
}

export const GET = conManejoDeErrores(obtenerInventario);
