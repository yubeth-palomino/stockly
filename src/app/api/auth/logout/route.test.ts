import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  const signOut = vi.fn();

  beforeEach(() => {
    signOut.mockReset();
    signOut.mockResolvedValue({ error: null });
    createClientMock.mockReset();
    createClientMock.mockResolvedValue({ auth: { signOut } });
  });

  it('cierra solo la sesión actual en Supabase Auth', async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});