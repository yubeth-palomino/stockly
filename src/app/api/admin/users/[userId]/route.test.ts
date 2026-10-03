import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminMock } = vi.hoisted(() => ({ requireAdminMock: vi.fn() }));

vi.mock('@/lib/supabase/admin-authorization', () => ({ requireAdmin: requireAdminMock }));

import { PATCH } from './route';

describe('PATCH /api/admin/users/[userId]', () => {
  beforeEach(() => requireAdminMock.mockReset());

  it('actualiza Auth y el perfil público', async () => {
    const updatedProfile = {
      id: 'user-2',
      email: 'new@example.com',
      full_name: 'Nuevo Nombre',
      role: 'admin',
      created_at: '2026-10-03T00:00:00.000Z',
    };
    const lookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-2', role: 'user' }, error: null }),
    };
    lookup.select.mockReturnValue(lookup);
    lookup.eq.mockReturnValue(lookup);

    const update = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
    };
    update.update.mockReturnValue(update);
    update.eq.mockReturnValue(update);
    update.select.mockReturnValue(update);

    const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(update);
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    requireAdminMock.mockResolvedValue({
      admin: { auth: { admin: { updateUserById } }, from },
      userId: 'admin-id',
    });

    const response = await PATCH(new Request('http://localhost/api/admin/users/user-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'NEW@example.com', fullName: 'Nuevo Nombre', role: 'admin' }),
    }), { params: Promise.resolve({ userId: 'user-2' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateUserById).toHaveBeenCalledWith('user-2', {
      email: 'new@example.com',
      email_confirm: true,
      user_metadata: { full_name: 'Nuevo Nombre' },
    });
    expect(update.update).toHaveBeenCalledWith({ role: 'admin' });
    expect(body.user).toEqual(updatedProfile);
  });

  it('impide degradar al último administrador', async () => {
    const lookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'admin-2', role: 'admin' }, error: null }),
    };
    lookup.select.mockReturnValue(lookup);
    lookup.eq.mockReturnValue(lookup);

    const adminCount = {
      select: vi.fn(),
      eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
    };
    adminCount.select.mockReturnValue(adminCount);
    const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(adminCount);
    const updateUserById = vi.fn();
    requireAdminMock.mockResolvedValue({ admin: { auth: { admin: { updateUserById } }, from }, userId: 'admin-1' });

    const response = await PATCH(new Request('http://localhost/api/admin/users/admin-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', fullName: 'Admin', role: 'user' }),
    }), { params: Promise.resolve({ userId: 'admin-2' }) });

    expect(response.status).toBe(409);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});