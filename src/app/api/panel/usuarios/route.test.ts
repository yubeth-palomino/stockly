import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  listarUsuarios: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({
  crearUsuario: vi.fn(),
  listarUsuarios: mocks.listarUsuarios,
}));

import { GET } from './route';

describe('/api/panel/usuarios', () => {
  beforeEach(() => vi.resetAllMocks());

  it('responde 403 a un trabajador antes de consultar usuarios', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.codigo).toBe('SIN_PERMISO');
    expect(mocks.listarUsuarios).not.toHaveBeenCalled();
  });

  it('permite a un dueño y devuelve la respuesta sin caché', async () => {
    mocks.exigirDueno.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.listarUsuarios.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.listarUsuarios).toHaveBeenCalledOnce();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
