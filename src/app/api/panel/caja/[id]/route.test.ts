import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  obtenerDetalleCaja: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({ obtenerDetalleCaja: mocks.obtenerDetalleCaja }));

import { GET } from './route';

describe('GET /api/panel/caja/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rechaza al trabajador antes de consultar el detalle financiero', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));
    const response = await GET(
      new Request('http://localhost/api/panel/caja/00000000-0000-4000-8000-000000000001'),
      { params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.obtenerDetalleCaja).not.toHaveBeenCalled();
  });
});
