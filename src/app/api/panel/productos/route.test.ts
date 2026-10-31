import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  listarInventario: vi.fn(),
  registrarEntrada: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({
  listarInventario: mocks.listarInventario,
  registrarEntrada: mocks.registrarEntrada,
}));

import { GET } from './route';

describe('/api/panel/productos', () => {
  beforeEach(() => vi.resetAllMocks());

  it('responde 401 sin usuario y no consulta inventario', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await GET(new Request('http://localhost/api/panel/productos'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.codigo).toBe('NO_AUTORIZADO');
    expect(mocks.listarInventario).not.toHaveBeenCalled();
  });

  it('pasa el rol trabajador al servicio al filtrar inventario', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.listarInventario.mockResolvedValue([]);

    const response = await GET(
      new Request('http://localhost/api/panel/productos?soloDisponibles=true'),
    );

    expect(response.status).toBe(200);
    expect(mocks.listarInventario).toHaveBeenCalledWith({ soloDisponibles: true }, 'trabajador');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
