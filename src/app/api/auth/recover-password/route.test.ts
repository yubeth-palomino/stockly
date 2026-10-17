import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { POST } from './route';

describe('POST /api/auth/recover-password', () => {
  const resetPasswordForEmail = vi.fn();

  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    resetPasswordForEmail.mockResolvedValue({ error: null });
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ auth: { resetPasswordForEmail } });
  });

  function request(body: unknown) {
    return new Request('http://localhost:3000/api/auth/recover-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('solicita un correo de recuperación con callback a la aplicación', async () => {
    const response = await POST(request({ email: ' YUBETH.PALOMINO01@USA.EDU.CO ' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(resetPasswordForEmail).toHaveBeenCalledWith('yubeth.palomino01@usa.edu.co', {
      redirectTo: 'http://localhost:3000/auth/confirm',
    });
  });

  it('valida el correo antes de solicitar el envío', async () => {
    const response = await POST(request({ email: 'correo-no-valido' }));

    expect(response.status).toBe(400);
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('devuelve un error explícito si Supabase no pudo enviar el correo', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: new Error('provider unavailable') });
    const response = await POST(request({ email: 'yubeth.palomino01@usa.edu.co' }));

    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain('No se pudo solicitar');
  });
});
