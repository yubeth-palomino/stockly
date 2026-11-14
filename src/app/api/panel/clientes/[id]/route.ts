import { exigirDueno } from '@/lib/auth/sesion';
import { actualizarCliente, obtenerDetalleCliente } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';
import { esquemaCambiosCliente } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ id: string }> };

async function obtenerCliente(_request: Request, contexto: Contexto) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const clienteId = z.string().uuid().parse(id);
  return responderOk(await obtenerDetalleCliente(clienteId, usuario.rol, hoyBogota()));
}

async function editarCliente(request: Request, contexto: Contexto) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const clienteId = z.string().uuid().parse(id);
  const cambios = await leerCuerpo(request, esquemaCambiosCliente);
  return responderOk(await actualizarCliente(clienteId, cambios, usuario.rol));
}

export const GET = conManejoDeErrores(obtenerCliente);
export const PATCH = conManejoDeErrores(editarCliente);
