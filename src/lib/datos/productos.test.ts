import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
  conTransaccion: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  consultar: mocks.consultar,
  conTransaccion: mocks.conTransaccion,
}));

import {
  buscarProductoEscaneado,
  obtenerFotoPathProducto,
  obtenerProducto,
  registrarEntrada,
} from './productos';

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
      .mockResolvedValueOnce([{ fotoPath: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const producto = await obtenerProducto(
      'producto-id',
      'trabajador',
      'usuario-trabajador',
      'empresa-1',
    );

    expect(producto.fotoUrl).toBeNull();
    expect(producto).not.toHaveProperty('fotoPath');
    expect(mocks.consultar).toHaveBeenNthCalledWith(
      3,
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

describe('fotografía del producto', () => {
  beforeEach(() => vi.resetAllMocks());

  it('asocia la foto a una entrada y devuelve la ruta anterior para limpieza', async () => {
    const tx = { query: vi.fn() };
    tx.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'producto-id',
          cantidad: 2,
          precioVenta: 50_000,
          fotoPath: 'productos/empresa/antigua.jpg',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'producto-id', cantidad: 5 }] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.conTransaccion.mockImplementation(async (operacion) => operacion(tx as never));

    const resultado = await registrarEntrada(
      {
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Descripción',
        talla: 'M',
        cantidad: 3,
        precioVenta: 50_000,
        fechaEntrada: '2026-11-07',
        fotoPath: 'productos/empresa/nueva.jpg',
      },
      'usuario-id',
      'trabajador',
      'empresa-id',
    );

    expect(tx.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('foto_path = COALESCE($3, foto_path)'),
      [3, null, 'productos/empresa/nueva.jpg', 'producto-id', 'empresa-id'],
    );
    expect(resultado).toEqual({
      productoId: 'producto-id',
      sumado: true,
      cantidadResultante: 5,
      fotoPathAnterior: 'productos/empresa/antigua.jpg',
    });
  });

  it('mantiene el registro de entradas sin foto compatible con el esquema anterior', async () => {
    const tx = { query: vi.fn() };
    tx.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'producto-id', cantidad: 2, precioVenta: 50_000 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'producto-id', cantidad: 5 }] })
      .mockResolvedValueOnce({ rows: [] });
    mocks.conTransaccion.mockImplementation(async (operacion) => operacion(tx as never));

    await registrarEntrada(
      {
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Descripción',
        talla: 'M',
        cantidad: 3,
        precioVenta: 50_000,
        fechaEntrada: '2026-11-07',
      },
      'usuario-id',
      'trabajador',
      'empresa-id',
    );

    expect(tx.query).toHaveBeenNthCalledWith(
      2,
      expect.not.stringContaining('foto_path'),
      ['empresa-id', 'CAM001', 'M'],
    );
    expect(tx.query).toHaveBeenNthCalledWith(
      3,
      expect.not.stringContaining('foto_path'),
      [3, null, 'producto-id', 'empresa-id'],
    );
  });

  it('limita la ruta de lectura de la foto al negocio del producto', async () => {
    mocks.consultar.mockResolvedValue([{ fotoPath: 'productos/empresa/foto.jpg' }]);

    const ruta = await obtenerFotoPathProducto('producto-id', 'empresa-id');

    expect(ruta).toBe('productos/empresa/foto.jpg');
    expect(mocks.consultar).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND empresa_id = $2'),
      ['producto-id', 'empresa-id'],
    );
  });
});
