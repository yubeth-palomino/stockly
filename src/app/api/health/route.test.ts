import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('/api/health', () => {
  it('responde con status ok y metadatos', async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.version).toBeDefined();
  });
});