import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { POST } from './route';

describe('POST /api/auth/reset-password', () => {
  function configureSupabase({
    user = { id: 'user-1' },
    userError = null,
    updateError = null,
  }: {
    user?: { id: string } | null;
    userError?: Error | null;
    updateError?: Error | null;
  } = {}) {
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: userError });
    const updateUser = vi.fn().mockResolvedValue({ error: updateError });
    createClientMock.mockResolvedValue({ auth: { getUser, updateUser } });
    return { getUser, updateUser };
  }

  function request(body: unknown) {
    return new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    createClientMock.mockReset();
  });

  it('actualiza la contraseña en Auth con la sesión verificada del enlace', async () => {
    const mocks = configureSupabase();
    const response = await POST(request({ newPassword: 'a-secure-new-password' }));

    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'a-secure-new-password' });
  });

  it('rechaza solicitudes sin contraseña válida', async () => {
    const response = await POST(request({ newPassword: 'short' }));

    expect(response.status).toBe(400);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rechaza enlaces sin sesión de recuperación válida', async () => {
    const mocks = configureSupabase({ user: null });
    const response = await POST(request({ newPassword: 'a-secure-new-password' }));

    expect(response.status).toBe(401);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('reporta errores de Supabase al guardar la nueva contraseña', async () => {
    const mocks = configureSupabase({ updateError: new Error('update failed') });
    const response = await POST(request({ newPassword: 'a-secure-new-password' }));

    expect(response.status).toBe(400);
    expect(mocks.updateUser).toHaveBeenCalledOnce();
  });
});
