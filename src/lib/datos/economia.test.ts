import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ consultar: vi.fn() }));
vi.mock('@/lib/db/conexion', () => ({ consultar: mocks.consultar }));

import { obtenerEconomia } from './economia';

describe('obtenerEconomia', () => {
  beforeEach(() => vi.resetAllMocks());

  it('suma inversión y ganancia potencial, sin inventar costo histórico de ventas', async () => {
    mocks.consultar.mockResolvedValueOnce([
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
      ]);

    const economia = await obtenerEconomia();

    expect(economia).toEqual({
      inversionTotal: 100_000,
      gananciaPotencialTotal: 150_000,
      gananciaRealizadaTotal: null,
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
    expect(mocks.consultar).toHaveBeenCalledTimes(1);
  });

  it('aplica el filtro de marca al detalle de inventario', async () => {
    mocks.consultar.mockResolvedValueOnce([]);

    await obtenerEconomia({ marca: ' Nike ' });

    expect(mocks.consultar.mock.calls[0]?.[0]).toContain('lower(marca) LIKE $1');
    expect(mocks.consultar.mock.calls[0]?.[1]).toEqual(['%nike%']);
  });

  it('no consulta ganancias comerciales sin una empresa autorizada en el contexto', async () => {
    mocks.consultar.mockResolvedValueOnce([]);

    const economia = await obtenerEconomia();

    expect(economia.gananciaRealizadaTotal).toBeNull();
    expect(mocks.consultar).toHaveBeenCalledTimes(1);
    expect(mocks.consultar.mock.calls[0]?.[0]).not.toContain('ventas_comerciales');
  });
});
