import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirDueno: vi.fn(),
  obtenerEconomia: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirDueno: mocks.exigirDueno }));
vi.mock('@/lib/dataService', () => ({ obtenerEconomia: mocks.obtenerEconomia }));

import { GET } from './route';

describe('/api/panel/economia', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rechaza trabajador sin consultar los datos económicos', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));

    const response = await GET(new Request('http://localhost/api/panel/economia'));
    const cuerpo = await response.json();

    expect(response.status).toBe(403);
    expect(cuerpo.error.codigo).toBe('SIN_PERMISO');
    expect(mocks.obtenerEconomia).not.toHaveBeenCalled();
  });

  it('entrega los totales al dueño y valida el filtro de marca', async () => {
    mocks.exigirDueno.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.obtenerEconomia.mockResolvedValue({
      inversionTotal: 10,
      gananciaPotencialTotal: 5,
      gananciaRealizadaTotal: 2,
      productos: [],
    });

    const response = await GET(
      new Request('http://localhost/api/panel/economia?marca=Nike'),
    );

    expect(response.status).toBe(200);
    expect(mocks.obtenerEconomia).toHaveBeenCalledWith({ marca: 'Nike' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
