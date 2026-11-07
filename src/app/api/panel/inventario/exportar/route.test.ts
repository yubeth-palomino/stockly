import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  exportarInventario: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({ exportarInventario: mocks.exportarInventario }));

import { GET } from './route';

describe('GET /api/panel/inventario/exportar', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requiere sesión antes de exportar', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    const response = await GET(new Request('http://localhost/api/panel/inventario/exportar'));
    expect(response.status).toBe(401);
    expect(mocks.exportarInventario).not.toHaveBeenCalled();
  });

  it('no exporta el costo de compra para el trabajador', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.exportarInventario.mockResolvedValue([{
      referencia: 'CAM001',
      marca: 'Marca',
      descripcion: 'Camisa',
      talla: 'M',
      cantidad: 3,
      precioVenta: 50_000,
      precioCompra: 20_000,
      codigoBarras: null,
      stockMinimo: 2,
    }]);

    const response = await GET(
      new Request('http://localhost/api/panel/inventario/exportar?marca=Marca&soloDisponibles=true'),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).not.toContain('precio_compra');
    expect(csv).not.toContain('20000');
    expect(mocks.exportarInventario).toHaveBeenCalledWith(
      { marca: 'Marca', soloDisponibles: true },
      'trabajador',
    );
  });
});
