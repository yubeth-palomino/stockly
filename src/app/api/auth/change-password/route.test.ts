import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { POST } from './route';

describe('POST /api/auth/change-password', () => {
  function configureSupabase({
    currentUser = { id: 'user-1', email: 'yubeth.palomino01@usa.edu.co' },
    userError = null,
    verificationError = null,
    updateError = null,
  }: {
    currentUser?: { id: string; email: string } | null;
    userError?: Error | null;
    verificationError?: Error | null;
    updateError?: Error | null;
  } = {}) {
    const getUser = vi.fn().mockResolvedValue({ data: { user: currentUser }, error: userError });
    const signInWithPassword = vi.fn().mockResolvedValue({ error: verificationError });
    const updateUser = vi.fn().mockResolvedValue({ error: updateError });

    createClientMock.mockResolvedValue({
      auth: { getUser, signInWithPassword, updateUser },
    });
    return { getUser, signInWithPassword, updateUser };
  }

  function request(body: unknown) {
    return new Request('http://localhost/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    createClientMock.mockReset();
  });

  it('verifica la contraseña actual y actualiza la contraseña autenticada', async () => {
    const mocks = configureSupabase();
    const response = await POST(request({
      currentPassword: 'old-password',
      newPassword: 'a-secure-new-password',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'yubeth.palomino01@usa.edu.co',
      password: 'old-password',
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'a-secure-new-password' });
  });

  it('rechaza solicitudes sin contraseña nueva válida', async () => {
    const response = await POST(request({
      currentPassword: 'old-password',
      newPassword: 'short',
    }));

    expect(response.status).toBe(400);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rechaza sesiones no autenticadas', async () => {
    const mocks = configureSupabase({ currentUser: null });
    const response = await POST(request({
      currentPassword: 'old-password',
      newPassword: 'a-secure-new-password',
    }));

    expect(response.status).toBe(401);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña actual incorrecta sin actualizar la cuenta', async () => {
    const mocks = configureSupabase({ verificationError: new Error('invalid credentials') });
    const response = await POST(request({
      currentPassword: 'wrong-password',
      newPassword: 'a-secure-new-password',
    }));

    expect(response.status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('reporta errores al actualizar la contraseña', async () => {
    const mocks = configureSupabase({ updateError: new Error('update failed') });
    const response = await POST(request({
      currentPassword: 'old-password',
      newPassword: 'a-secure-new-password',
    }));

    expect(response.status).toBe(400);
    expect(mocks.updateUser).toHaveBeenCalledOnce();
  });
});
