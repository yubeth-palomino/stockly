import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { GET } from './route';

describe('GET /auth/confirm', () => {
  const exchangeCodeForSession = vi.fn();
  const verifyOtp = vi.fn();

  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    verifyOtp.mockReset();
    verifyOtp.mockResolvedValue({ error: null });
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ auth: { exchangeCodeForSession, verifyOtp } });
  });

  it('intercambia el código PKCE y vuelve al formulario de contraseña', async () => {
    const response = await GET(new Request('http://localhost:3000/auth/confirm?code=valid-code'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/reset-password');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
  });

  it('envía al panel después de confirmar un registro', async () => {
    const response = await GET(
      new Request(
        'http://localhost:3000/auth/confirm?code=valid-code&type=signup&next=%2Fpanel',
      ),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3000/panel');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
  });

  it('verifica el token hash de una invitación y habilita el formulario de contraseña', async () => {
    const response = await GET(
      new Request('http://localhost:3000/auth/confirm?token_hash=invite-token&type=invite'),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3000/reset-password');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'invite-token', type: 'invite' });
  });

  it('verifica el token hash de un registro y va al panel', async () => {
    const response = await GET(
      new Request(
        'http://localhost:3000/auth/confirm?token_hash=signup-token&type=signup&next=%2Fpanel',
      ),
    );

    expect(response.headers.get('location')).toBe('http://localhost:3000/panel');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'signup-token', type: 'signup' });
  });

  it('rechaza tipos de token no permitidos', async () => {
    const response = await GET(
      new Request('http://localhost:3000/auth/confirm?token_hash=token&type=magiclink'),
    );

    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/reset-password?error=link',
    );
    expect(createClientMock).not.toHaveBeenCalled();
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
