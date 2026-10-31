import { exigirDueno } from '@/lib/auth/sesion';
import { desactivarProducto } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ParametrosRuta = { params: Promise<{ id: string }> };

async function desactivar(_request: Request, contexto: ParametrosRuta) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const productoId = z.string().uuid().parse(id);
  await desactivarProducto(productoId, usuario.id);
  return responderOk({ desactivado: true });
}

export const POST = conManejoDeErrores(desactivar);
