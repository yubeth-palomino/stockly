import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  obtenerDashboardComercial: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  obtenerDashboardComercial: mocks.obtenerDashboardComercial,
}));

import { GET } from './route';

describe('/api/panel/dashboard', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rechaza al trabajador antes de consultar métricas', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));

    const response = await GET(new Request('http://localhost/api/panel/dashboard'));

    expect(response.status).toBe(403);
    expect(mocks.obtenerDashboardComercial).not.toHaveBeenCalled();
  });
});
