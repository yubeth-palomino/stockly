import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseEnvironment } from './environment';

describe('getSupabaseEnvironment', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('usa los nombres estándar cuando están configurados', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://primary.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'primary-key');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL', 'https://alias.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY', 'alias-key');

    expect(getSupabaseEnvironment()).toEqual({
      url: 'https://primary.supabase.co',
      publishableKey: 'primary-key',
    });
  });

  it('admite los nombres de variables que ya existen en Vercel', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL', 'https://alias.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY', 'alias-key');

    expect(getSupabaseEnvironment()).toEqual({
      url: 'https://alias.supabase.co',
      publishableKey: 'alias-key',
    });
  });

  it('falla explícitamente si no existe configuración', () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('STOCKLY_SUPABASE_URL', '');
    vi.stubEnv('STOCKLY_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_ANON_KEY', '');
    vi.stubEnv('STOCKLY_SUPABASE_ANON_KEY', '');

    expect(() => getSupabaseEnvironment()).toThrow(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  });

  it('usa solo las credenciales de staging en Vercel Preview', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('STOCKLY_PREVIEW_SUPABASE_URL', 'https://staging.supabase.co');
    vi.stubEnv('STOCKLY_PREVIEW_SUPABASE_PUBLISHABLE_KEY', 'staging-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://production.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'production-key');

    expect(getSupabaseEnvironment()).toEqual({
      url: 'https://staging.supabase.co',
      publishableKey: 'staging-key',
    });
  });

  it('no usa las credenciales de producción si falta la configuración de Preview', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('STOCKLY_PREVIEW_SUPABASE_URL', '');
    vi.stubEnv('STOCKLY_PREVIEW_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://production.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'production-key');

    expect(() => getSupabaseEnvironment()).toThrow(
      'Faltan STOCKLY_PREVIEW_SUPABASE_URL o STOCKLY_PREVIEW_SUPABASE_PUBLISHABLE_KEY en Preview.',
    );
  });
});
