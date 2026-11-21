import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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

  it('usa la conexión directa fuera de Vercel aunque Next esté en producción', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STOCKLY_POSTGRES_URL', 'postgres://pool.example/base');
    vi.stubEnv('STOCKLY_POSTGRES_URL_NON_POOLING', 'postgres://direct.example/base');
    const { obtenerVariableConexion } = await import('@/lib/db/conexion');

    expect(obtenerVariableConexion()).toBe('STOCKLY_POSTGRES_URL_NON_POOLING');
  });

  it('conserva el pool de transacciones en Vercel', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('STOCKLY_POSTGRES_URL', 'postgres://pool.example/base');
    vi.stubEnv('STOCKLY_POSTGRES_URL_NON_POOLING', 'postgres://direct.example/base');
    const { obtenerVariableConexion } = await import('@/lib/db/conexion');

    expect(obtenerVariableConexion()).toBe('STOCKLY_POSTGRES_URL');
  });

  it('usa la conexión principal si no se configuró la directa', async () => {
    vi.stubEnv('VERCEL', '');
    vi.stubEnv('STOCKLY_POSTGRES_URL', 'postgres://pool.example/base');
    vi.stubEnv('STOCKLY_POSTGRES_URL_NON_POOLING', '');
    const { obtenerVariableConexion } = await import('@/lib/db/conexion');

    expect(obtenerVariableConexion()).toBe('STOCKLY_POSTGRES_URL');
  });
});
