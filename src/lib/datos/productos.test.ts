import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
  conTransaccion: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  consultar: mocks.consultar,
  conTransaccion: mocks.conTransaccion,
}));

import { obtenerProducto } from './productos';

describe('obtenerProducto', () => {
  beforeEach(() => vi.resetAllMocks());

  it('limita el historial de movimientos de un trabajador a sus propios eventos', async () => {
    mocks.consultar
      .mockResolvedValueOnce([{
        id: 'producto-id',
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Descripción',
        talla: 'M',
        cantidad: 1,
        precioVenta: 50_000,
        fechaEntrada: '2026-11-07',
        activo: true,
        disponible: true,
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await obtenerProducto('producto-id', 'trabajador', 'usuario-trabajador');

    expect(mocks.consultar).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('AND usuario_id = $2'),
      ['producto-id', 'usuario-trabajador'],
    );
  });
});
