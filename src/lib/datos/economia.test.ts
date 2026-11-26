import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ consultar: vi.fn() }));
vi.mock('@/lib/db/conexion', () => ({ consultar: mocks.consultar }));

import { obtenerEconomia } from './economia';

describe('obtenerEconomia', () => {
  beforeEach(() => vi.resetAllMocks());

  it('suma inversión y ganancia potencial usando el costo actual para las ventas', async () => {
    mocks.consultar
      .mockResolvedValueOnce([
        {
          id: 'producto-1',
          referencia: 'CAM001',
          marca: 'Nike',
          talla: 'M',
          cantidad: 5,
          precioVenta: 50_000,
          precioCompra: 20_000,
        },
        {
          id: 'producto-2',
          referencia: 'CAM002',
          marca: 'Nike',
          talla: 'S',
          cantidad: 0,
          precioVenta: 80_000,
          precioCompra: 30_000,
        },
        {
          id: 'producto-3',
          referencia: 'CAM003',
          marca: 'Otra',
          talla: 'L',
          cantidad: 4,
          precioVenta: 60_000,
          precioCompra: null,
        },
      ])
      .mockResolvedValueOnce([{ gananciaRealizada: '80000' }]);

    const economia = await obtenerEconomia({}, 'empresa-1');

    expect(economia).toEqual({
      inversionTotal: 100_000,
      gananciaPotencialTotal: 150_000,
      gananciaRealizadaTotal: 80_000,
      productos: [
        expect.objectContaining({
          referencia: 'CAM001',
          inversion: 100_000,
          gananciaPorUnidad: 30_000,
          gananciaPotencial: 150_000,
          sinPrecioCompra: false,
        }),
        expect.objectContaining({
          referencia: 'CAM002',
          inversion: 0,
          gananciaPotencial: 0,
          sinPrecioCompra: false,
        }),
        expect.objectContaining({
          referencia: 'CAM003',
          precioCompra: null,
          inversion: null,
          gananciaPotencial: null,
          sinPrecioCompra: true,
        }),
      ],
    });
    expect(mocks.consultar).toHaveBeenCalledTimes(2);
    expect(mocks.consultar.mock.calls[1]?.[0]).toContain(
      '(v.precio_venta::numeric - p.precio_compra::numeric)',
    );
    expect(mocks.consultar.mock.calls[1]?.[0]).not.toContain('costo_unitario');
  });

  it('aplica el filtro de marca al detalle de inventario', async () => {
    mocks.consultar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ gananciaRealizada: '0' }]);

    await obtenerEconomia({ marca: ' Nike ' }, 'empresa-1');

    expect(mocks.consultar.mock.calls[0]?.[0]).toContain('lower(marca) LIKE $2');
    expect(mocks.consultar.mock.calls[0]?.[1]).toEqual(['empresa-1', '%nike%']);
    expect(mocks.consultar.mock.calls[1]?.[0]).toContain('lower(p.marca) LIKE $2');
    expect(mocks.consultar.mock.calls[1]?.[1]).toEqual(['empresa-1', '%nike%']);
  });

  it('devuelve cero de ganancia realizada cuando no hay ventas con costo de compra', async () => {
    mocks.consultar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ gananciaRealizada: '0' }]);

    const economia = await obtenerEconomia({}, 'empresa-1');

    expect(economia.gananciaRealizadaTotal).toBe(0);
    expect(mocks.consultar).toHaveBeenCalledTimes(2);
    expect(mocks.consultar.mock.calls[1]?.[0]).toContain('p.precio_compra IS NOT NULL');
  });
});
