import { exigirUsuario } from '@/lib/auth/sesion';
import { listarInventario, registrarEntrada } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaEntradaProducto, esquemaFiltrosInventario } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerProductos(request: Request) {
  const usuario = await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = esquemaFiltrosInventario.parse(parametros);
  const filtros = {
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.marca !== undefined ? { marca: parsed.marca } : {}),
    ...(parsed.talla !== undefined ? { talla: parsed.talla } : {}),
    ...(parsed.soloDisponibles !== undefined ? { soloDisponibles: parsed.soloDisponibles } : {}),
  };
  return responderOk(await listarInventario(filtros, usuario.rol));
}

async function crearProducto(request: Request) {
  const usuario = await exigirUsuario();
  const datos = await leerCuerpo(request, esquemaEntradaProducto);
  return responderOk(await registrarEntrada(datos, usuario.id), 201);
}

export const GET = conManejoDeErrores(obtenerProductos);
export const POST = conManejoDeErrores(crearProducto);
