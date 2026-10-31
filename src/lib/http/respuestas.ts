import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { ErrorDeNegocio, type CodigoError, ESTADO_HTTP, MENSAJES } from '@/lib/reglas/errores';

type ErrorPostgres = {
  code?: string;
  constraint?: string;
};

const CABECERAS_SIN_CACHE = { 'Cache-Control': 'no-store' };

export function responderOk<T>(datos: T, estado = 200): NextResponse {
  return NextResponse.json({ ok: true, datos }, { status: estado, headers: CABECERAS_SIN_CACHE });
}

function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function traducirErrorPostgres(error: ErrorPostgres): CodigoError | null {
  if (error.code === '23505' && error.constraint === 'ux_productos_ref_talla') {
    return 'PRODUCTO_DUPLICADO';
  }
  if (error.code === '23505' && error.constraint === 'ux_usuarios_usuario') {
    return 'USUARIO_DUPLICADO';
  }
  if (error.code === '23503' && error.constraint === 'ventas_producto_id_fkey') {
    return 'PRODUCTO_CON_VENTAS';
  }
  if (error.code === '23514') return 'DATOS_INVALIDOS';
  return null;
}

function respuestaErrorNegocio(codigo: CodigoError, detalles?: unknown): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        codigo,
        mensaje: MENSAJES[codigo],
        ...(detalles === undefined ? {} : { detalles }),
      },
    },
    { status: ESTADO_HTTP[codigo], headers: CABECERAS_SIN_CACHE },
  );
}

export function responderError(error: unknown): NextResponse {
  if (error instanceof ErrorDeNegocio) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          codigo: error.codigo,
          mensaje: error.message,
          ...(error.detalles === undefined ? {} : { detalles: error.detalles }),
        },
      },
      { status: ESTADO_HTTP[error.codigo], headers: CABECERAS_SIN_CACHE },
    );
  }

  if (error instanceof ZodError) {
    return respuestaErrorNegocio('DATOS_INVALIDOS', error.flatten());
  }

  if (esErrorPostgres(error)) {
    const codigo = traducirErrorPostgres(error);
    if (codigo) return respuestaErrorNegocio(codigo);
  }

  console.error('Error interno en una ruta de Stockly:', error);
  return respuestaErrorNegocio('ERROR_INTERNO');
}

export function conManejoDeErrores<Argumentos extends unknown[]>(
  handler: (...argumentos: Argumentos) => Promise<Response>,
): (...argumentos: Argumentos) => Promise<Response> {
  return async (...argumentos) => {
    try {
      return await handler(...argumentos);
    } catch (error) {
      return responderError(error);
    }
  };
}

export async function leerCuerpo<T>(request: Request, esquema: ZodType<T>): Promise<T> {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    throw new ErrorDeNegocio('DATOS_INVALIDOS');
  }
  return esquema.parse(cuerpo);
}
