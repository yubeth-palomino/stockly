import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
  conTransaccion: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  consultar: mocks.consultar,
  conTransaccion: mocks.conTransaccion,
}));

import { buscarProductoEscaneado, obtenerProducto } from './productos';

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

    await obtenerProducto(
      'producto-id',
      'trabajador',
      'usuario-trabajador',
      'empresa-1',
    );

    expect(mocks.consultar).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('AND usuario_id = $3'),
      ['producto-id', 'empresa-1', 'usuario-trabajador'],
    );
  });
});

describe('buscarProductoEscaneado', () => {
  beforeEach(() => vi.resetAllMocks());

  it('busca por código o referencia normalizada y serializa por rol', async () => {
    mocks.consultar.mockResolvedValue([]);

    await buscarProductoEscaneado('cam 001', 'trabajador', 'empresa-1');

    expect(mocks.consultar).toHaveBeenCalledWith(
      expect.stringContaining('codigo_barras = $2 OR clave_referencia = $3'),
      ['empresa-1', 'cam 001', 'CAM 001', 'CAM001', expect.any(Number)],
    );
    expect(mocks.consultar.mock.calls[0]?.[0]).not.toContain('precio_compra');
  });
});
