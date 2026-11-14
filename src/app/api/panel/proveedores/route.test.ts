import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  listarProveedores: vi.fn(),
  guardarProveedor: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  listarProveedores: mocks.listarProveedores,
  guardarProveedor: mocks.guardarProveedor,
}));

import { GET, POST } from './route';

describe('/api/panel/proveedores', () => {
  beforeEach(() => vi.resetAllMocks());

  it('bloquea a trabajadores antes de consultar o crear proveedores', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));
    const consulta = await GET(new Request('http://localhost/api/panel/proveedores'));
    const alta = await POST(
      new Request('http://localhost/api/panel/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Proveedor de prueba' }),
      }),
    );

    expect(consulta.status).toBe(403);
    expect(alta.status).toBe(403);
    expect(mocks.listarProveedores).not.toHaveBeenCalled();
    expect(mocks.guardarProveedor).not.toHaveBeenCalled();
  });
});
