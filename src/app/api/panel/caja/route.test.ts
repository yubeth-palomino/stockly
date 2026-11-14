import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  abrirCaja: vi.fn(),
  listarHistorialCajas: vi.fn(),
  obtenerCajaActual: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  abrirCaja: mocks.abrirCaja,
  listarHistorialCajas: mocks.listarHistorialCajas,
  obtenerCajaActual: mocks.obtenerCajaActual,
}));

import { GET, POST } from './route';

describe('/api/panel/caja', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rechaza a un trabajador antes de consultar la caja', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.obtenerCajaActual).not.toHaveBeenCalled();
    expect(mocks.listarHistorialCajas).not.toHaveBeenCalled();
  });

  it('rechaza la apertura a un trabajador antes de leer el cuerpo', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));

    const response = await POST(
      new Request('http://localhost/api/panel/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoApertura: 10_000,
          claveApertura: '00000000-0000-4000-8000-000000000001',
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.abrirCaja).not.toHaveBeenCalled();
  });
});
