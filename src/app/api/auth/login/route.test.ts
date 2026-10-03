import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { POST } from './route';

describe('POST /api/auth/login', () => {
  function configureSupabase({ authError, profile, profileError }: {
    authError?: Error | null;
    profile?: { id: string; email: string; full_name: string; role: string } | null;
    profileError?: Error | null;
  } = {}) {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: authError ? null : { id: 'user-1' } },
      error: authError,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: profile === undefined
        ? { id: 'user-1', email: 'demo@stockly.com', full_name: 'Usuario demo', role: 'user' }
        : profile,
      error: profileError ?? null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    createClientMock.mockResolvedValue({ auth: { signInWithPassword, signOut }, from });
    return { signInWithPassword, signOut, from, select, eq };
  }

  beforeEach(() => {
    createClientMock.mockReset();
  });

  it('autentica con Supabase Auth y comprueba el perfil en public.users', async () => {
    const mocks = configureSupabase();
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ' DEMO@STOCKLY.COM ', password: 'valid-password' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'demo@stockly.com', password: 'valid-password' });
    expect(mocks.from).toHaveBeenCalledWith('users');
    expect(mocks.select).toHaveBeenCalledWith('id, email, full_name, role');
    expect(mocks.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(body.user).toEqual({ id: 'user-1', email: 'demo@stockly.com', full_name: 'Usuario demo', role: 'user' });
  });

  it('rechaza credenciales incorrectas', async () => {
    const mocks = configureSupabase({ authError: new Error('invalid credentials') });
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@stockly.com', password: 'incorrecta' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Correo o contraseña incorrectos.');
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('revoca el inicio de sesión si falta el perfil en public.users', async () => {
    const mocks = configureSupabase({ profile: null });
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@stockly.com', password: 'valid-password' }),
    }));

    expect(response.status).toBe(503);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});