import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buscarUsuarioPorEmail: vi.fn(),
  contarSolicitudesRecuperacion: vi.fn(),
  invalidarTokensPendientes: vi.fn(),
  crearTokenRecuperacion: vi.fn(),
  enviarCorreo: vi.fn(),
  generarToken: vi.fn(),
  calcularHashToken: vi.fn(),
  obtenerUrlBase: vi.fn(),
  plantillaRecuperacion: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  buscarUsuarioPorEmail: mocks.buscarUsuarioPorEmail,
  contarSolicitudesRecuperacion: mocks.contarSolicitudesRecuperacion,
  invalidarTokensPendientes: mocks.invalidarTokensPendientes,
  crearTokenRecuperacion: mocks.crearTokenRecuperacion,
}));
vi.mock('@/lib/correo', () => ({ enviarCorreo: mocks.enviarCorreo }));
vi.mock('@/lib/tokenRecuperacion', () => ({
  generarToken: mocks.generarToken,
  calcularHashToken: mocks.calcularHashToken,
}));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: mocks.obtenerUrlBase }));
vi.mock('@/lib/plantillasCorreo', () => ({ plantillaRecuperacion: mocks.plantillaRecuperacion }));

import { POST } from './route';

describe('POST /api/auth/recuperar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buscarUsuarioPorEmail.mockResolvedValue(null);
    mocks.contarSolicitudesRecuperacion.mockResolvedValue(0);
    mocks.invalidarTokensPendientes.mockResolvedValue(undefined);
    mocks.crearTokenRecuperacion.mockResolvedValue('reset-id');
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'email-id' });
    mocks.generarToken.mockReturnValue('a'.repeat(64));
    mocks.calcularHashToken.mockReturnValue('sha256-hash');
    mocks.obtenerUrlBase.mockReturnValue('https://stockly.example');
    mocks.plantillaRecuperacion.mockReturnValue('<p>Recuperación</p>');
  });

  function request(body: unknown) {
    return new Request('http://localhost/api/auth/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('devuelve el mensaje neutral si el correo no está registrado', async () => {
    const response = await POST(request({ email: 'nadie@example.com' }));

    expect(response.status).toBe(200);
    expect((await response.json()).message).toBe(
      'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.',
    );
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('crea un token hasheado y envía el enlace para una cuenta válida', async () => {
    mocks.buscarUsuarioPorEmail.mockResolvedValue({ id: 'user-1', email: 'ana@example.com' });
    const response = await POST(request({ email: ' ANA@EXAMPLE.COM ' }));

    expect(response.status).toBe(200);
    expect(mocks.contarSolicitudesRecuperacion).toHaveBeenCalledWith('user-1');
    expect(mocks.invalidarTokensPendientes).toHaveBeenCalledWith('user-1');
    expect(mocks.crearTokenRecuperacion).toHaveBeenCalledWith('user-1', 'sha256-hash');
    expect(mocks.enviarCorreo).toHaveBeenCalledWith({
      para: 'ana@example.com',
      asunto: 'Restablecer contraseña',
      html: '<p>Recuperación</p>',
    });
    expect(mocks.plantillaRecuperacion).toHaveBeenCalledWith(
      `https://stockly.example/restablecer-contrasena?token=${'a'.repeat(64)}`,
    );
  });

  it('conserva la respuesta neutral al alcanzar el límite de solicitudes', async () => {
    mocks.buscarUsuarioPorEmail.mockResolvedValue({ id: 'user-1', email: 'ana@example.com' });
    mocks.contarSolicitudesRecuperacion.mockResolvedValue(3);
    const response = await POST(request({ email: 'ana@example.com' }));

    expect(response.status).toBe(200);
    expect(mocks.crearTokenRecuperacion).not.toHaveBeenCalled();
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('conserva la respuesta neutral si el proveedor de correo falla', async () => {
    mocks.buscarUsuarioPorEmail.mockRejectedValue(new Error('fallo interno'));
    const response = await POST(request({ email: 'ana@example.com' }));

    expect(response.status).toBe(200);
    expect((await response.json()).message).toContain('Si el correo está registrado');
  });

  it('rechaza correos inválidos antes de consultar usuarios', async () => {
    const response = await POST(request({ email: 'correo-invalido' }));

    expect(response.status).toBe(400);
    expect(mocks.buscarUsuarioPorEmail).not.toHaveBeenCalled();
  });
});