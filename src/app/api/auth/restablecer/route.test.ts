import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buscarTokenVigente: vi.fn(),
  marcarTokenComoUsado: vi.fn(),
  actualizarContrasenaUsuario: vi.fn(),
  invalidarTokensPendientes: vi.fn(),
  calcularHashToken: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  buscarTokenVigente: mocks.buscarTokenVigente,
  marcarTokenComoUsado: mocks.marcarTokenComoUsado,
  actualizarContrasenaUsuario: mocks.actualizarContrasenaUsuario,
  invalidarTokensPendientes: mocks.invalidarTokensPendientes,
}));
vi.mock('@/lib/tokenRecuperacion', () => ({ calcularHashToken: mocks.calcularHashToken }));

import { POST } from './route';

describe('POST /api/auth/restablecer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buscarTokenVigente.mockResolvedValue({ id: 'reset-1', usuario_id: 'user-1' });
    mocks.marcarTokenComoUsado.mockResolvedValue(true);
    mocks.actualizarContrasenaUsuario.mockResolvedValue(undefined);
    mocks.invalidarTokensPendientes.mockResolvedValue(undefined);
    mocks.calcularHashToken.mockReturnValue('sha256-hash');
  });

  function request(body: unknown) {
    return new Request('http://localhost/api/auth/restablecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('consume el token, actualiza la contraseña y no inicia sesión', async () => {
    const response = await POST(request({
      token: 'a'.repeat(64),
      contrasena: 'clave-nueva-segura',
      confirmacion: 'clave-nueva-segura',
    }));

    expect(response.status).toBe(200);
    expect(mocks.buscarTokenVigente).toHaveBeenCalledWith('sha256-hash');
    expect(mocks.marcarTokenComoUsado).toHaveBeenCalledWith('reset-1');
    expect(mocks.actualizarContrasenaUsuario).toHaveBeenCalledWith('user-1', 'clave-nueva-segura');
    expect(mocks.invalidarTokensPendientes).toHaveBeenCalledWith('user-1');
  });

  it('rechaza un token inexistente o vencido', async () => {
    mocks.buscarTokenVigente.mockResolvedValue(null);
    const response = await POST(request({
      token: 'b'.repeat(64),
      contrasena: 'clave-nueva-segura',
      confirmacion: 'clave-nueva-segura',
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('El enlace no es válido o ya venció.');
    expect(mocks.actualizarContrasenaUsuario).not.toHaveBeenCalled();
  });

  it('rechaza el reuso de un token consumido', async () => {
    mocks.marcarTokenComoUsado.mockResolvedValue(false);
    const response = await POST(request({
      token: 'c'.repeat(64),
      contrasena: 'clave-nueva-segura',
      confirmacion: 'clave-nueva-segura',
    }));

    expect(response.status).toBe(400);
    expect(mocks.actualizarContrasenaUsuario).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas que no coinciden o son demasiado cortas', async () => {
    const mismatch = await POST(request({ token: 'd'.repeat(64), contrasena: 'clave-nueva-segura', confirmacion: 'otra-clave' }));
    const short = await POST(request({ token: 'e'.repeat(64), contrasena: 'corta', confirmacion: 'corta' }));

    expect(mismatch.status).toBe(400);
    expect(short.status).toBe(400);
    expect(mocks.buscarTokenVigente).not.toHaveBeenCalled();
  });
});