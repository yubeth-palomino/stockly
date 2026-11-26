import { exigirUsuario } from '@/lib/auth/sesion';
import { obtenerFotoPathProducto } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_FOTOS_PRODUCTO } from '@/lib/storage/fotosProducto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ParametrosRuta = { params: Promise<{ id: string }> };

async function obtenerFoto(_request: Request, contexto: ParametrosRuta) {
  await exigirUsuario();
  const { id } = await contexto.params;
  const productoId = z.string().uuid().parse(id);
  const rutaFoto = await obtenerFotoPathProducto(productoId);
  if (!rutaFoto) {
    return new Response(null, {
      status: 404,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const { data, error } = await createAdminClient()
    .storage.from(BUCKET_FOTOS_PRODUCTO)
    .createSignedUrl(rutaFoto, 60);
  if (error) throw error;
  if (!data.signedUrl) throw new Error('Supabase no devolvió un enlace para la fotografía.');

  return new Response(null, {
    status: 302,
    headers: {
      Location: data.signedUrl,
      'Cache-Control': 'private, no-store',
    },
  });
}

export const GET = conManejoDeErrores(obtenerFoto);
