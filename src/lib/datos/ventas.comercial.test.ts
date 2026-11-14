import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  conTransaccion: vi.fn(),
  consultar: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  conTransaccion: mocks.conTransaccion,
  consultar: mocks.consultar,
}));

import { registrarVentaConPago } from './ventas';
import type { DatosVentaComercial } from './tipos';

describe('permisos de venta comercial', () => {
  beforeEach(() => vi.resetAllMocks());

  it('no permite a trabajador vincular clientes ni vender a crédito', async () => {
    const clienteId = '00000000-0000-4000-8000-000000000001';
    const ventaPagadaConCliente: DatosVentaComercial = {
      referencia: 'CAM001',
      talla: 'M',
      cantidad: 1,
      tipoPago: 'PAGADA',
      pagos: [{ metodo: 'EFECTIVO', monto: 50_000 }],
      clienteId,
      claveIdempotencia: '00000000-0000-4000-8000-000000000002',
    };
    const ventaCredito: DatosVentaComercial = {
      ...ventaPagadaConCliente,
      tipoPago: 'CREDITO',
      pagos: [],
    };

    await expect(
      registrarVentaConPago(ventaPagadaConCliente, clienteId, 'trabajador'),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    await expect(
      registrarVentaConPago(ventaCredito, clienteId, 'trabajador'),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    expect(mocks.conTransaccion).not.toHaveBeenCalled();
  });
});
