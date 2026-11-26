import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  obtenerFotoPathProducto: vi.fn(),
  createAdminClient: vi.fn(),
  storageFrom: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({
  obtenerFotoPathProducto: mocks.obtenerFotoPathProducto,
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));

import { GET } from './route';

const id = '00000000-0000-4000-8000-000000000001';

describe('GET /api/panel/productos/[id]/foto', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exigirUsuario.mockResolvedValue({ id: 'usuario', rol: 'trabajador' });
    mocks.obtenerFotoPathProducto.mockResolvedValue('productos/empresa/foto.jpg');
    mocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example/foto-firmada' },
      error: null,
    });
    mocks.storageFrom.mockReturnValue({ createSignedUrl: mocks.createSignedUrl });
    mocks.createAdminClient.mockReturnValue({
      storage: { from: mocks.storageFrom },
    });
  });

  it('sirve la foto solo mediante una URL temporal firmada', async () => {
    const response = await GET(
      new Request(`http://localhost/api/panel/productos/${id}/foto`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://storage.example/foto-firmada');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.storageFrom).toHaveBeenCalledWith('stockly-productos');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith('productos/empresa/foto.jpg', 60);
  });

  it('devuelve 404 cuando el producto no tiene fotografía', async () => {
    mocks.obtenerFotoPathProducto.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/panel/productos/${id}/foto`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});
