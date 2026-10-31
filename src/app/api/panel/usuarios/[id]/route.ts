import { exigirDueno } from '@/lib/auth/sesion';
import { actualizarUsuario } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaCambiosUsuario } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ParametrosRuta = { params: Promise<{ id: string }> };

async function editarUsuario(request: Request, contexto: ParametrosRuta) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const usuarioId = z.string().uuid().parse(id);
  const parsed = await leerCuerpo(request, esquemaCambiosUsuario);
  const cambios = {
    ...(parsed.nombre !== undefined ? { nombre: parsed.nombre } : {}),
    ...(parsed.rol !== undefined ? { rol: parsed.rol } : {}),
    ...(parsed.activo !== undefined ? { activo: parsed.activo } : {}),
  };
  await actualizarUsuario(usuarioId, cambios, usuario.id);
  return responderOk({ actualizado: true });
}

export const PATCH = conManejoDeErrores(editarUsuario);
