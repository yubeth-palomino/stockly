import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  obtenerProducto: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({ obtenerProducto: mocks.obtenerProducto }));

import { GET } from './route';

const id = '00000000-0000-4000-8000-000000000001';

describe('GET /api/panel/productos/[id]/kardex', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exige autenticación antes de consultar el Kardex', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await GET(new Request(`http://localhost/api/panel/productos/${id}/kardex`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(401);
    expect(mocks.obtenerProducto).not.toHaveBeenCalled();
  });

  it('exporta eventos filtrados con cabeceras seguras para CSV', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.obtenerProducto.mockResolvedValue({
      id,
      eventos: [{
        id: 17,
        createdAt: '2030-06-15T10:00:00.000Z',
        tipo: '=FORMULA()',
        detalle: { nota: 'entrada, inicial' },
      }],
    });

    const response = await GET(
      new Request(`http://localhost/api/panel/productos/${id}/kardex?desde=2030-06-01&tipo=VENTA_REGISTRADA`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toContain(`"'=FORMULA()"`);
    expect(mocks.obtenerProducto).toHaveBeenCalledWith(
      id,
      'dueno',
      'usuario-dueno',
      { desde: '2030-06-01', tipo: 'VENTA_REGISTRADA' },
    );
  });

  it('rechaza rangos de fechas invertidos', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });

    const response = await GET(
      new Request(`http://localhost/api/panel/productos/${id}/kardex?desde=2030-06-16&hasta=2030-06-15`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.obtenerProducto).not.toHaveBeenCalled();
  });
});
