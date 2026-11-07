import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  actualizarProducto: vi.fn(),
  obtenerProducto: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({
  actualizarProducto: mocks.actualizarProducto,
  obtenerProducto: mocks.obtenerProducto,
}));

import { GET, PATCH } from './route';

const id = '00000000-0000-4000-8000-000000000001';

function solicitud(cuerpo: unknown): Request {
  return new Request(`http://localhost/api/panel/productos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

describe('GET /api/panel/productos/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('pasa la identidad del trabajador al servicio del detalle', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.obtenerProducto.mockResolvedValue({ id });

    const response = await GET(new Request(`http://localhost/api/panel/productos/${id}`), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(mocks.obtenerProducto).toHaveBeenCalledWith(
      id,
      'trabajador',
      'usuario-trabajador',
    );
  });
});

describe('PATCH /api/panel/productos/[id]', () => {
  beforeEach(() => vi.resetAllMocks());

  it('ignora precioCompra enviado por trabajador', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.actualizarProducto.mockResolvedValue(undefined);

    const response = await PATCH(solicitud({ marca: 'Nueva marca', precioCompra: -10_000 }), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(mocks.actualizarProducto).toHaveBeenCalledWith(
      id,
      { marca: 'Nueva marca' },
      'usuario-trabajador',
      'trabajador',
    );
  });

  it('permite editar precioCompra al dueño', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.actualizarProducto.mockResolvedValue(undefined);

    const response = await PATCH(solicitud({ precioVenta: 50_000, precioCompra: 20_000 }), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(mocks.actualizarProducto).toHaveBeenCalledWith(
      id,
      { precioVenta: 50_000, precioCompra: 20_000 },
      'usuario-dueno',
      'dueno',
    );
  });

  it('permite configurar stock mínimo solo al dueño', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.actualizarProducto.mockResolvedValue(undefined);

    const response = await PATCH(solicitud({ stockMinimo: 3 }), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(mocks.actualizarProducto).toHaveBeenCalledWith(
      id,
      { stockMinimo: 3 },
      'usuario-dueno',
      'dueno',
    );
  });

  it('ignora stock mínimo enviado por trabajador', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.actualizarProducto.mockResolvedValue(undefined);

    const response = await PATCH(solicitud({ marca: 'Marca nueva', stockMinimo: 3 }), {
      params: Promise.resolve({ id }),
    });

    expect(response.status).toBe(200);
    expect(mocks.actualizarProducto).toHaveBeenCalledWith(
      id,
      { marca: 'Marca nueva' },
      'usuario-trabajador',
      'trabajador',
    );
  });
});
