import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, consultarMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  consultarMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));
vi.mock('@/lib/db/conexion', () => ({ consultar: consultarMock }));

import { POST } from './route';

describe('POST /api/auth/login', () => {
  function configureSupabase({ authError, profile, profileError }: {
    authError?: Error | null;
    profile?: { id: string; nombre: string; rol: string } | null;
    profileError?: Error | null;
  } = {}) {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: {
        user: authError ? null : { id: 'user-1' },
        session: authError ? null : { access_token: 'session-token' },
      },
      error: authError,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    if (profileError) consultarMock.mockRejectedValue(profileError);
    else {
      consultarMock.mockResolvedValue(
        profile === undefined
          ? [{ id: 'stockly-user-1', nombre: 'Dueña', rol: 'dueno' }]
          : profile
            ? [profile]
            : [],
      );
    }

    createClientMock.mockResolvedValue({ auth: { signInWithPassword, signOut } });
    return { signInWithPassword, signOut };
  }

  beforeEach(() => {
    createClientMock.mockReset();
    consultarMock.mockReset();
  });

  it('autentica con Supabase y valida usuario activo/rol en public.usuarios', async () => {
    const mocks = configureSupabase();
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ' YUBETH.PALOMINO01@USA.EDU.CO ', password: 'valid-password' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'yubeth.palomino01@usa.edu.co', password: 'valid-password' });
    expect(consultarMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM usuarios'),
      ['user-1'],
    );
    expect(body.user).toEqual({ id: 'stockly-user-1', nombre: 'Dueña', rol: 'dueno' });
  });

  it('rechaza credenciales incorrectas', async () => {
    configureSupabase({ authError: new Error('invalid credentials') });
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'yubeth.palomino01@usa.edu.co', password: 'incorrecta' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Correo o contraseña incorrectos.');
    expect(consultarMock).not.toHaveBeenCalled();
  });

  it('cierra la sesión cuando la cuenta no está activa en Stockly', async () => {
    const mocks = configureSupabase({ profile: null });
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'yubeth.palomino01@usa.edu.co', password: 'valid-password' }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('cierra la sesión si la cuenta no tiene rol Stockly válido', async () => {
    const mocks = configureSupabase({
      profile: { id: 'stockly-user-1', nombre: 'Usuario', rol: 'admin' },
    });
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usuario@example.com', password: 'valid-password' }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('no declara éxito si Supabase no entrega una sesión', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    });
    const signOut = vi.fn();
    createClientMock.mockResolvedValue({ auth: { signInWithPassword, signOut } });

    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usuario@example.com', password: 'valid-password' }),
    }));

    expect(response.status).toBe(401);
    expect(consultarMock).not.toHaveBeenCalled();
  });

  it('no deja una sesión abierta si la comprobación de acceso falla', async () => {
    const mocks = configureSupabase({ profileError: new Error('database unavailable') });
    const response = await POST(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usuario@example.com', password: 'valid-password' }),
    }));

    expect(response.status).toBe(503);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});