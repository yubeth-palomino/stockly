import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  registrarVenta: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({ registrarVenta: mocks.registrarVenta }));

import { POST } from './route';

describe('POST /api/panel/ventas', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requiere sesión antes de intentar registrar una venta', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await POST(
      new Request('http://localhost/api/panel/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencia: 'CAM001', talla: 'M', cantidad: 2 }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.registrarVenta).not.toHaveBeenCalled();
  });

  it('registra una venta válida para el usuario autenticado', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.registrarVenta.mockResolvedValue({
      venta: { id: 42 },
      cantidadResultante: 3,
      agotado: false,
    });

    const response = await POST(
      new Request('http://localhost/api/panel/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencia: 'CAM001', talla: 'M', cantidad: 2 }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      ok: true,
      datos: { venta: { id: 42 }, cantidadResultante: 3, agotado: false },
    });
    expect(mocks.registrarVenta).toHaveBeenCalledWith(
      { referencia: 'CAM001', talla: 'M', cantidad: 2 },
      'usuario-trabajador',
    );
  });

  it('rechaza cantidades inválidas antes de llamar al servicio', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });

    const response = await POST(
      new Request('http://localhost/api/panel/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencia: 'CAM001', talla: 'M', cantidad: 0 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.registrarVenta).not.toHaveBeenCalled();
  });
});
