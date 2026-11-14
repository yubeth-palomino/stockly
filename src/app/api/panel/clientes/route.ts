import { exigirDueno } from '@/lib/auth/sesion';
import { guardarCliente, listarClientes } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaCliente } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function obtenerClientes(request: Request) {
  const usuario = await exigirDueno();
  const consulta = z
    .string()
    .trim()
    .max(120)
    .optional()
    .parse(new URL(request.url).searchParams.get('q') ?? undefined);
  return responderOk(await listarClientes(consulta, usuario.rol));
}

async function crearCliente(request: Request) {
  const usuario = await exigirDueno();
  const datos = await leerCuerpo(request, esquemaCliente);
  return responderOk(await guardarCliente(datos, usuario.id, usuario.rol), 201);
}

export const GET = conManejoDeErrores(obtenerClientes);
export const POST = conManejoDeErrores(crearCliente);
