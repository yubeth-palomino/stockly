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
});