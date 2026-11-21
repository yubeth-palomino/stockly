import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  buscarProductoEscaneado: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({
  buscarProductoEscaneado: mocks.buscarProductoEscaneado,
}));

import { GET } from './route';

describe('/api/panel/productos/buscar-escaneado', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exige una sesión antes de buscar códigos', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await GET(
      new Request('http://localhost/api/panel/productos/buscar-escaneado?codigo=CAM001'),
    );

    expect(response.status).toBe(401);
    expect(mocks.buscarProductoEscaneado).not.toHaveBeenCalled();
  });

  it('busca por código o referencia usando el rol autenticado', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.buscarProductoEscaneado.mockResolvedValue([]);

    const response = await GET(
      new Request('http://localhost/api/panel/productos/buscar-escaneado?codigo=%20CAM001%20'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.buscarProductoEscaneado).toHaveBeenCalledWith('CAM001', 'trabajador');
    expect(body.datos).toEqual([]);
  });
});
