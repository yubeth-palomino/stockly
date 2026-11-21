import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  enviar: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@vercel/connect', () => ({ getToken: mocks.getToken }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.enviar };
  },
}));

import { enviarCorreo, obtenerClaveResend } from './correo';

describe('correo con Resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', '  clave-de-prueba  ');
    vi.stubEnv('RESEND_FROM', 'Stockly <noreply@example.com>');
    vi.stubEnv('NODE_ENV', 'production');
    mocks.getToken.mockResolvedValue('token-vercel');
    mocks.enviar.mockResolvedValue({ data: { id: 'correo-1' }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('usa la clave configurada sin espacios', async () => {
    await expect(obtenerClaveResend()).resolves.toBe('clave-de-prueba');
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it('usa el token de Vercel cuando no hay clave de Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    await expect(obtenerClaveResend()).resolves.toBe('token-vercel');
    expect(mocks.getToken).toHaveBeenCalledWith('stockly', { subject: { type: 'app' } });
  });

  it('devuelve un fallo explícito si no puede obtener la clave del conector', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    mocks.getToken.mockRejectedValue(new Error('conector no disponible'));

    const resultado = await enviarCorreo({
      para: 'ana@example.com',
      asunto: 'Prueba',
      html: '<p>Prueba</p>',
    });

    expect(resultado).toEqual({ ok: false, error: 'conector no disponible' });
    expect(mocks.enviar).not.toHaveBeenCalled();
  });

  it('rechaza el remitente de pruebas en producción si no hay uno verificado', async () => {
    vi.stubEnv('RESEND_FROM', '');

    const resultado = await enviarCorreo({
      para: 'ana@example.com',
      asunto: 'Prueba',
      html: '<p>Prueba</p>',
    });

    expect(resultado).toEqual({
      ok: false,
      error: 'Configura RESEND_FROM con un remitente de un dominio verificado en Resend.',
    });
    expect(mocks.enviar).not.toHaveBeenCalled();
  });

  it('usa el remitente configurado y devuelve el identificador de Resend', async () => {
    const resultado = await enviarCorreo({
      para: 'ana@example.com',
      asunto: 'Prueba',
      html: '<p>Prueba</p>',
    });

    expect(mocks.enviar).toHaveBeenCalledWith({
      from: 'Stockly <noreply@example.com>',
      to: 'ana@example.com',
      subject: 'Prueba',
      html: '<p>Prueba</p>',
    });
    expect(resultado).toEqual({ ok: true, id: 'correo-1' });
  });

  it('mantiene el remitente de prueba solo en desarrollo', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('RESEND_FROM', '');

    const resultado = await enviarCorreo({
      para: 'ana@example.com',
      asunto: 'Prueba',
      html: '<p>Prueba</p>',
    });

    expect(mocks.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'onboarding@resend.dev' }),
    );
    expect(resultado).toEqual({ ok: true, id: 'correo-1' });
  });

  it('devuelve los errores del proveedor sin aparentar un envío correcto', async () => {
    mocks.enviar.mockResolvedValue({ data: null, error: { message: 'Remitente no verificado' } });

    const resultado = await enviarCorreo({
      para: 'ana@example.com',
      asunto: 'Prueba',
      html: '<p>Prueba</p>',
    });

    expect(resultado).toEqual({ ok: false, error: 'Remitente no verificado' });
  });
});
