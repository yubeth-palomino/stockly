import { exigirDueno } from '@/lib/auth/sesion';
import { guardarProveedor, listarProveedores } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaProveedor } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function obtenerProveedores(request: Request) {
  const usuario = await exigirDueno();
  const consulta = z
    .string()
    .trim()
    .max(120)
    .optional()
    .parse(new URL(request.url).searchParams.get('q') ?? undefined);
  return responderOk(await listarProveedores(consulta, usuario.rol));
}

async function crearProveedor(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaProveedor);
  return responderOk(await guardarProveedor(datos, usuario.id, usuario.rol), 201);
}

export const GET = conManejoDeErrores(obtenerProveedores);
export const POST = conManejoDeErrores(crearProveedor);
