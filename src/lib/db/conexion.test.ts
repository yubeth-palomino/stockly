import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('conexión de base de datos', () => {
  it('no exige la URL de Postgres al importar la capa de datos', async () => {
    vi.stubEnv('STOCKLY_POSTGRES_URL', '');
    vi.stubEnv('STOCKLY_POSTGRES_URL_NON_POOLING', '');

    await expect(import('@/lib/dataService')).resolves.toBeDefined();
  });
});
