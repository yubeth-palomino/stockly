import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { GET } from './route';

describe('GET /auth/confirm', () => {
  const exchangeCodeForSession = vi.fn();

  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ auth: { exchangeCodeForSession } });
  });

  it('intercambia el código PKCE y vuelve al formulario de contraseña', async () => {
    const response = await GET(new Request('http://localhost:3000/auth/confirm?code=valid-code'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/reset-password');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
  });

  it('vuelve al login ante un error de código', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid code') });
    const response = await GET(new Request('http://localhost:3000/auth/confirm?code=invalid-code'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/reset-password?error=link',
    );
  });

  it('redirige si falta el código sin crear una sesión', async () => {
    const response = await GET(new Request('http://localhost:3000/auth/confirm'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/reset-password?error=link',
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
