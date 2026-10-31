import { describe, expect, it, vi } from 'vitest';
import { conManejoDeErrores, leerCuerpo, responderError, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaVenta } from '@/lib/validacion/esquemas';

describe('respuestas HTTP', () => {
  it('usa el formato común y no permite cachear respuestas correctas', async () => {
    const response = responderOk({ nombre: 'Dueña', rol: 'dueno' });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      datos: { nombre: 'Dueña', rol: 'dueno' },
    });
  });

  it('traduce errores de negocio y Postgres a errores estandarizados', async () => {
    const negocio = responderError(new ErrorDeNegocio('SIN_PERMISO'));
    expect(negocio.status).toBe(403);
    expect(negocio.headers.get('Cache-Control')).toBe('no-store');

    const postgres = responderError(
      Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'ux_productos_ref_talla',
      }),
    );
    expect(postgres.status).toBe(409);
    await expect(postgres.json()).resolves.toMatchObject({
      ok: false,
      error: { codigo: 'PRODUCTO_DUPLICADO' },
    });
  });

  it('devuelve errores de validación sin detalles técnicos', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = responderError(new Error('detalle interno'));
    const errorInterno = responderError(
      Object.assign(new Error('detalle interno'), { code: '08006' }),
    );

    expect(response.status).toBe(500);
    expect(errorInterno.status).toBe(500);
    expect(logError).toHaveBeenCalledTimes(2);
    await expect(errorInterno.json()).resolves.toMatchObject({
      ok: false,
      error: { codigo: 'ERROR_INTERNO' },
    });
    logError.mockRestore();
  });

  it('valida JSON con esquema y convierte fallos a 400', async () => {
    const datos = await leerCuerpo(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ referencia: 'CAM001', talla: 'M', cantidad: 2 }),
      }),
      esquemaVenta,
    );
    expect(datos).toEqual({ referencia: 'CAM001', talla: 'M', cantidad: 2 });

    const response = await leerCuerpo(
      new Request('http://localhost/api', {
        method: 'POST',
        body: JSON.stringify({ referencia: 'CAM001', talla: 'M', cantidad: 0 }),
      }),
      esquemaVenta,
    ).then(
      () => {
        throw new Error('Se esperaba que el esquema rechazara la cantidad cero.');
      },
      (error: unknown) => responderError(error),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('captura errores del handler y los devuelve con el formato común', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = conManejoDeErrores(async () => {
      throw new ErrorDeNegocio('NO_AUTORIZADO');
    });

    const response = await handler();
    expect(response.status).toBe(401);
    expect(logError).not.toHaveBeenCalled();
    logError.mockRestore();
  });
});
