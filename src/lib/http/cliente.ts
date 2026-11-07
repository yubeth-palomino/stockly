import { z, type ZodType } from 'zod';

const esquemaRespuestaExitosa = z.object({
  ok: z.literal(true),
  datos: z.unknown(),
});

const esquemaRespuestaError = z.object({
  ok: z.literal(false),
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
  }),
});

export class ErrorRespuestaApi extends Error {
  constructor(
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorRespuestaApi';
  }
}

export async function leerRespuestaApi<T>(response: Response, esquema: ZodType<T>): Promise<T> {
  let cuerpo: unknown;
  try {
    cuerpo = await response.json();
  } catch {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }

  if (!response.ok) {
    const error = esquemaRespuestaError.safeParse(cuerpo);
    if (error.success) throw new ErrorRespuestaApi(error.data.error.codigo, error.data.error.mensaje);
    throw new ErrorRespuestaApi('ERROR_INTERNO', 'No se pudo completar la solicitud.');
  }

  const respuesta = esquemaRespuestaExitosa.safeParse(cuerpo);
  if (!respuesta.success) throw new Error('El servidor devolvió una respuesta inválida.');
  const datos = esquema.safeParse(respuesta.data.datos);
  if (!datos.success) throw new Error('La respuesta del servidor no tiene el formato esperado.');
  return datos.data;
}
