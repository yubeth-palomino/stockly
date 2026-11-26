import { afterEach, describe, expect, it, vi } from 'vitest';

const { crearClienteSupabase } = vi.hoisted(() => ({
  crearClienteSupabase: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: crearClienteSupabase,
}));

vi.mock('./server', () => ({
  getSupabaseEnvironment: () =>
    process.env.VERCEL_ENV === 'preview'
      ? {
          url: 'https://staging.supabase.co',
          publishableKey: 'staging-publishable-key',
        }
      : {
          url: 'https://production.supabase.co',
          publishableKey: 'production-publishable-key',
        },
}));

import { createAdminClient } from './admin';

describe('createAdminClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('usa la clave de servicio exclusiva de Preview', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('STOCKLY_SUPABASE_SERVICE_ROLE_KEY', 'production-service-key');
    vi.stubEnv('STOCKLY_PREVIEW_SUPABASE_SERVICE_ROLE_KEY', 'preview-service-key');

    createAdminClient();

    expect(crearClienteSupabase).toHaveBeenCalledWith(
      'https://staging.supabase.co',
      'preview-service-key',
      expect.any(Object),
    );
  });

  it('no usa la clave de producción si falta la clave de servicio de Preview', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('STOCKLY_SUPABASE_SERVICE_ROLE_KEY', 'production-service-key');
    vi.stubEnv('STOCKLY_PREVIEW_SUPABASE_SERVICE_ROLE_KEY', '');

    expect(() => createAdminClient()).toThrow(
      'Falta STOCKLY_PREVIEW_SUPABASE_SERVICE_ROLE_KEY en el servidor.',
    );
    expect(crearClienteSupabase).not.toHaveBeenCalled();
  });

  it('conserva la clave de servicio estándar fuera de Preview', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('STOCKLY_SUPABASE_SERVICE_ROLE_KEY', 'production-service-key');

    createAdminClient();

    expect(crearClienteSupabase).toHaveBeenCalledWith(
      'https://production.supabase.co',
      'production-service-key',
      expect.any(Object),
    );
  });
});
