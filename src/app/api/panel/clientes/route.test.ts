import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  listarClientes: vi.fn(),
  guardarCliente: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  listarClientes: mocks.listarClientes,
  guardarCliente: mocks.guardarCliente,
}));

import { GET, POST } from './route';

describe('/api/panel/clientes', () => {
  beforeEach(() => vi.resetAllMocks());

  it('bloquea a trabajadores antes de consultar o crear datos del cliente', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));
    const consulta = await GET(new Request('http://localhost/api/panel/clientes'));
    const alta = await POST(
      new Request('http://localhost/api/panel/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Cliente de prueba' }),
      }),
    );

    expect(consulta.status).toBe(403);
    expect(alta.status).toBe(403);
    expect(mocks.listarClientes).not.toHaveBeenCalled();
    expect(mocks.guardarCliente).not.toHaveBeenCalled();
  });
});
