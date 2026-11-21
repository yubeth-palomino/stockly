import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminClient: vi.fn(),
  authClient: vi.fn(),
  conTransaccion: vi.fn(),
  query: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({ conTransaccion: mocks.conTransaccion }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.adminClient }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.authClient }));

import { POST } from './route';

describe('POST /api/auth/register', () => {
  const signUp = vi.fn();
  const signOut = vi.fn();
  const deleteUser = vi.fn();

  function solicitud(cuerpo: unknown) {
    return new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO public.empresas')) {
        return { rows: [{ id: 'empresa-1' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO public.usuarios')) {
        return { rows: [{ id: 'usuario-1' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    mocks.conTransaccion.mockImplementation(
      async (trabajo: (tx: { query: typeof mocks.query }) => Promise<unknown>) =>
        trabajo({ query: mocks.query }),
    );
    signUp.mockResolvedValue({
      data: {
        user: { id: 'auth-1', identities: [{ id: 'identidad-1' }] },
        session: { access_token: 'token' },
      },
      error: null,
    });
    signOut.mockResolvedValue({ error: null });
    deleteUser.mockResolvedValue({ error: null });
    mocks.authClient.mockResolvedValue({ auth: { signUp, signOut } });
    mocks.adminClient.mockReturnValue({ auth: { admin: { deleteUser } } });
  });

  it('crea negocio, perfil de dueño y membresía cuando Auth inicia sesión', async () => {
    const response = await POST(
      solicitud({
        nombre: 'Ana Pérez',
        correo: 'ANA@EXAMPLE.COM',
        contrasena: 'contrasena-segura',
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ sesion: true });
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@example.com' }),
    );
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.usuarios'),
      ['Ana Pérez', 'ana', 'auth-1', 'empresa-1'],
    );
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.empresas_usuarios'),
      ['empresa-1', 'usuario-1'],
    );
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.usuarios_sucursales'),
      ['empresa-1', 'usuario-1', expect.any(String)],
    );
  });

  it('crea el negocio y solicita confirmación cuando Auth no devuelve sesión', async () => {
    signUp.mockResolvedValue({
      data: {
        user: { id: 'auth-1', identities: [{ id: 'identidad-1' }] },
        session: null,
      },
      error: null,
    });

    const response = await POST(
      solicitud({
        nombre: 'Ana Pérez',
        correo: 'ana@example.com',
        contrasena: 'contrasena-segura',
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ sesion: false, mensaje: expect.any(String) });
  });

  it('rechaza datos inválidos antes de crear una identidad', async () => {
    const response = await POST(
      solicitud({ nombre: 'A', correo: 'correo-invalido', contrasena: 'corta' }),
    );

    expect(response.status).toBe(400);
    expect(signUp).not.toHaveBeenCalled();
    expect(mocks.conTransaccion).not.toHaveBeenCalled();
  });

  it('rechaza una identidad duplicada sin crear otro negocio', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'auth-1', identities: [] }, session: null },
      error: null,
    });

    const response = await POST(
      solicitud({
        nombre: 'Ana Pérez',
        correo: 'ana@example.com',
        contrasena: 'contrasena-segura',
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.conTransaccion).not.toHaveBeenCalled();
  });

  it('elimina la identidad Auth si falla la preparación del negocio', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO public.empresas')) {
        return { rows: [{ id: 'empresa-1' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO public.usuarios_sucursales')) {
        throw new Error('database unavailable');
      }
      if (sql.includes('INSERT INTO public.usuarios')) {
        return { rows: [{ id: 'usuario-1' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    const response = await POST(
      solicitud({
        nombre: 'Ana Pérez',
        correo: 'ana@example.com',
        contrasena: 'contrasena-segura',
      }),
    );

    expect(response.status).toBe(503);
    expect(deleteUser).toHaveBeenCalledWith('auth-1');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
