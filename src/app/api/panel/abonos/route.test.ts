import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  listarAbonos: vi.fn(),
  registrarAbono: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  listarAbonos: mocks.listarAbonos,
  registrarAbono: mocks.registrarAbono,
}));

import { GET, POST } from './route';

describe('/api/panel/abonos', () => {
  beforeEach(() => vi.resetAllMocks());

  it('bloquea consulta y registro de abonos para trabajadores', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));
    const consulta = await GET(
      new Request(
        'http://localhost/api/panel/abonos?cuentaId=00000000-0000-4000-8000-000000000001',
      ),
    );
    const alta = await POST(
      new Request('http://localhost/api/panel/abonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuentaId: '00000000-0000-4000-8000-000000000001',
          monto: 100,
          metodo: 'EFECTIVO',
          claveIdempotencia: '00000000-0000-4000-8000-000000000002',
        }),
      }),
    );

    expect(consulta.status).toBe(403);
    expect(alta.status).toBe(403);
    expect(mocks.listarAbonos).not.toHaveBeenCalled();
    expect(mocks.registrarAbono).not.toHaveBeenCalled();
  });
});
