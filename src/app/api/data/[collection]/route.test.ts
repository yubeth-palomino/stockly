import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('/api/data/[collection]', () => {
  it('lista los productos registrados', async () => {
    const response = await GET(new Request('http://localhost/api/data/products?limit=3'), {
      params: Promise.resolve({ collection: 'products' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.data).toHaveLength(3);
    expect(body.data.data[0].sku).toBeDefined();
  });

  it('rechaza colecciones no registradas', async () => {
    const response = await GET(new Request('http://localhost/api/data/unknown'), {
      params: Promise.resolve({ collection: 'unknown' }),
    });

    expect(response.status).toBe(404);
  });

  it('no permite consultar usuarios ni sesiones mediante el CRUD generico', async () => {
    const usersResponse = await GET(new Request('http://localhost/api/data/users'), {
      params: Promise.resolve({ collection: 'users' }),
    });
    const sessionsResponse = await GET(new Request('http://localhost/api/data/sessions'), {
      params: Promise.resolve({ collection: 'sessions' }),
    });

    expect(usersResponse.status).toBe(404);
    expect(sessionsResponse.status).toBe(404);
  });
});