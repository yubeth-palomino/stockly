import { exigirDueno } from '@/lib/auth/sesion';
import { obtenerDetalleCaja } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ id: string }> };

async function consultarDetalle(_request: Request, contexto: Contexto) {
  const usuario = await exigirDueno();
  const { id } = await contexto.params;
  const cajaId = z.string().uuid().parse(id);
  return responderOk(await obtenerDetalleCaja(cajaId, usuario.rol));
}

export const GET = conManejoDeErrores(consultarDetalle);
