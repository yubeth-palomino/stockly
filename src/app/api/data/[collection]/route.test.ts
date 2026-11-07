import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminMock } = vi.hoisted(() => ({ requireAdminMock: vi.fn() }));

vi.mock('@/lib/supabase/admin-authorization', () => ({
  requireAdmin: requireAdminMock,
}));

import { GET, POST } from './route';

const requestFor = (path: string, method = 'GET') =>
  new Request(`http://localhost${path}`, { method });

const contextFor = (collection: string) => ({
  params: Promise.resolve({ collection }),
});

describe('/api/data/[collection]', () => {
  beforeEach(() => {
    requireAdminMock.mockReset().mockResolvedValue({ admin: {}, userId: 'admin-id' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lista datos solo para una cuenta administradora', async () => {
    const response = await GET(
      requestFor('/api/data/products?limit=3'),
      contextFor('products'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(3);
    expect(body.data.data[0].sku).toBeDefined();
  });

  it('rechaza lecturas sin rol administrador', async () => {
    requireAdminMock.mockResolvedValue({
      response: new Response('unauthorized', { status: 401 }),
    });

    const response = await GET(
      requestFor('/api/data/products'),
      contextFor('products'),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rechaza escrituras sin rol administrador', async () => {
    requireAdminMock.mockResolvedValue({
      response: new Response('forbidden', { status: 403 }),
    });

    const response = await POST(
      requestFor('/api/data/products', 'POST'),
      contextFor('products'),
    );

    expect(response.status).toBe(403);
  });

  it('desactiva el almacenamiento JSON legado en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const response = await GET(
      requestFor('/api/data/products'),
      contextFor('products'),
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.code).toBe('LEGACY_STORAGE_DISABLED');
    expect(requireAdminMock).not.toHaveBeenCalled();
  });

  it('rechaza colecciones no registradas', async () => {
    const response = await GET(
      requestFor('/api/data/unknown'),
      contextFor('unknown'),
    );

    expect(response.status).toBe(404);
  });

  it('no permite consultar usuarios ni sesiones mediante el CRUD genérico', async () => {
    const usersResponse = await GET(
      requestFor('/api/data/users'),
      contextFor('users'),
    );
    const sessionsResponse = await GET(
      requestFor('/api/data/sessions'),
      contextFor('sessions'),
    );

    expect(usersResponse.status).toBe(404);
    expect(sessionsResponse.status).toBe(404);
  });
});
