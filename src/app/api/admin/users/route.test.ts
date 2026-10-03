import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminMock } = vi.hoisted(() => ({ requireAdminMock: vi.fn() }));

vi.mock('@/lib/supabase/admin-authorization', () => ({ requireAdmin: requireAdminMock }));

import { GET, POST } from './route';

describe('/api/admin/users', () => {
  beforeEach(() => requireAdminMock.mockReset());

  it('rechaza las solicitudes sin rol de administrador', async () => {
    requireAdminMock.mockResolvedValue({ response: new Response('forbidden', { status: 403 }) });

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it('crea una cuenta Auth confirmada y devuelve solo el perfil', async () => {
    const profile = {
      id: 'user-new',
      email: 'ana@example.com',
      full_name: 'Ana Perez',
      role: 'user',
      created_at: '2026-10-03T00:00:00.000Z',
    };
    const single = vi.fn().mockResolvedValue({ data: profile, error: null });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-new' } }, error: null });
    const deleteUser = vi.fn();
    requireAdminMock.mockResolvedValue({
      admin: { auth: { admin: { createUser, deleteUser } }, from },
      userId: 'admin-id',
    });

    const response = await POST(new Request('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ' ANA@EXAMPLE.COM ', fullName: ' Ana Perez ', password: 'long-test-password' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createUser).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'long-test-password',
      email_confirm: true,
      user_metadata: { full_name: 'Ana Perez' },
    });
    expect(body.user).toEqual(profile);
    expect(body.user).not.toHaveProperty('password');
    expect(deleteUser).not.toHaveBeenCalled();
  });
});