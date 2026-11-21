import { exigirUsuario } from '@/lib/auth/sesion';
import { buscarProductoEscaneado } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { esquemaCodigoEscaneado } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerProductoEscaneado(request: Request) {
  const usuario = await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const { codigo } = esquemaCodigoEscaneado.parse(parametros);
  return responderOk(await buscarProductoEscaneado(codigo, usuario.rol));
}

export const GET = conManejoDeErrores(obtenerProductoEscaneado);
