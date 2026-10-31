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
});
