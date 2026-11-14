import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  listarCuentasPorCobrar: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  listarCuentasPorCobrar: mocks.listarCuentasPorCobrar,
}));

import { GET } from './route';

describe('/api/panel/cuentas-por-cobrar', () => {
  beforeEach(() => vi.resetAllMocks());

  it('bloquea a trabajadores antes de consultar saldos de clientes', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));
    const response = await GET(new Request('http://localhost/api/panel/cuentas-por-cobrar'));

    expect(response.status).toBe(403);
    expect(mocks.listarCuentasPorCobrar).not.toHaveBeenCalled();
  });
});
