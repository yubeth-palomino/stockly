import { exigirUsuario } from '@/lib/auth/sesion';
import { listarVentas, registrarVenta } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaFiltrosVentas, esquemaVenta } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerVentas(request: Request) {
  await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = esquemaFiltrosVentas.parse(parametros);
  const filtros = {
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.desde !== undefined ? { desde: parsed.desde } : {}),
    ...(parsed.hasta !== undefined ? { hasta: parsed.hasta } : {}),
  };
  return responderOk(await listarVentas(filtros));
}

async function crearVenta(request: Request) {
  const usuario = await exigirUsuario();
  const datos = await leerCuerpo(request, esquemaVenta);
  return responderOk(await registrarVenta(datos, usuario.id), 201);
}

export const GET = conManejoDeErrores(obtenerVentas);
export const POST = conManejoDeErrores(crearVenta);
