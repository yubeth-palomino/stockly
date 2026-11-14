import { exigirDueno } from '@/lib/auth/sesion';
import { actualizarProveedor, obtenerProveedor } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaCambiosProveedor } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ id: string }> };

async function consultarProveedor(_request: Request, contexto: Contexto) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const proveedorId = z.string().uuid().parse(id);
  return responderOk(await obtenerProveedor(proveedorId, usuario.rol));
}

async function editarProveedor(request: Request, contexto: Contexto) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const proveedorId = z.string().uuid().parse(id);
  const cambios = await leerCuerpo(request, esquemaCambiosProveedor);
  return responderOk(await actualizarProveedor(proveedorId, cambios, usuario.rol));
}

export const GET = conManejoDeErrores(consultarProveedor);
export const PATCH = conManejoDeErrores(editarProveedor);
