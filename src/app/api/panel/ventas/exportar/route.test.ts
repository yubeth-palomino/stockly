import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  exportarVentas: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({ exportarVentas: mocks.exportarVentas }));

import { GET } from './route';

describe('GET /api/panel/ventas/exportar', () => {
  beforeEach(() => vi.resetAllMocks());

  it('exporta el periodo consultado sin límite de la tabla paginada', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.exportarVentas.mockResolvedValue([{
      id: 8,
      fechaVenta: '2030-06-15',
      referencia: 'CAM001',
      talla: 'M',
      cantidad: 2,
      precioVenta: 50_000,
    }]);

    const response = await GET(
      new Request('http://localhost/api/panel/ventas/exportar?desde=2030-06-01&hasta=2030-06-30'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('ventas-stockly.csv');
    expect(await response.text()).toContain('"CAM001"');
    expect(mocks.exportarVentas).toHaveBeenCalledWith({
      desde: '2030-06-01',
      hasta: '2030-06-30',
    });
  });
});
