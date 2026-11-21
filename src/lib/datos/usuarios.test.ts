import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
  conTransaccion: vi.fn(),
  query: vi.fn(),
  createAdminClient: vi.fn(),
  generateLink: vi.fn(),
  deleteUser: vi.fn(),
  enviarCorreo: vi.fn(),
  plantillaInvitacion: vi.fn(),
  obtenerUrlBase: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  conTransaccion: mocks.conTransaccion,
  consultar: mocks.consultar,
}));
vi.mock('@/lib/auth/sesion', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/correo', () => ({ enviarCorreo: mocks.enviarCorreo }));
vi.mock('@/lib/plantillasCorreo', () => ({ plantillaInvitacion: mocks.plantillaInvitacion }));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: mocks.obtenerUrlBase }));

import { crearUsuario } from './usuarios';

describe('crear invitación de usuario Stockly', () => {
  const datos = {
    nombre: 'Ana Pérez',
    usuario: 'ana_perez',
    rol: 'trabajador' as const,
    correo: 'ana@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM public.sucursales')) {
        return { rows: [{ id: 'sucursal-1' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO usuarios')) {
        return { rows: [{ id: 'stockly-1' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    mocks.conTransaccion.mockImplementation(
      async (trabajo: (tx: { query: typeof mocks.query }) => Promise<unknown>) =>
        trabajo({ query: mocks.query }),
    );
    mocks.generateLink.mockResolvedValue({
      data: {
        user: { id: 'auth-1' },
        properties: { action_link: 'https://supabase.example/invite?token=secure' },
      },
      error: null,
    });
    mocks.deleteUser.mockResolvedValue({ error: null });
    mocks.createAdminClient.mockReturnValue({
      auth: { admin: { generateLink: mocks.generateLink, deleteUser: mocks.deleteUser } },
    });
    mocks.consultar.mockResolvedValue([{ id: 'stockly-1' }]);
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'email-1' });
    mocks.plantillaInvitacion.mockReturnValue('<p>Invitación</p>');
    mocks.obtenerUrlBase.mockReturnValue('https://stockly.example');
  });

  it('crea la identidad y el perfil Stockly, luego envía el enlace de activación', async () => {
    await expect(crearUsuario(datos, 'empresa-1')).resolves.toEqual({ id: 'stockly-1' });

    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: 'invite',
      email: 'ana@example.com',
      options: {
        data: { full_name: 'Ana Pérez' },
        redirectTo: 'https://stockly.example/auth/confirm',
      },
    });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO usuarios'),
      ['Ana Pérez', 'ana_perez', 'trabajador', 'auth-1', 'empresa-1'],
    );
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.empresas_usuarios'),
      ['empresa-1', 'stockly-1', 'trabajador', 'asignadas'],
    );
    expect(mocks.enviarCorreo).toHaveBeenCalledWith({
      para: 'ana@example.com',
      asunto: 'Invitación para acceder a Stockly',
      html: '<p>Invitación</p>',
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('revierte ambas cuentas si no se puede enviar la invitación', async () => {
    mocks.enviarCorreo.mockResolvedValue({ ok: false, error: 'Remitente no verificado.' });

    await expect(crearUsuario(datos, 'empresa-1')).rejects.toMatchObject({
      codigo: 'ERROR_INTERNO',
      message: 'Remitente no verificado.',
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM usuarios WHERE auth_ref = $1 AND empresa_id = $2'),
      ['auth-1', 'empresa-1'],
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith('auth-1');
  });

  it('rechaza una dirección que ya existe sin insertar un perfil Stockly', async () => {
    mocks.generateLink.mockResolvedValue({
      data: { user: null, properties: null },
      error: { code: 'email_exists' },
    });

    await expect(crearUsuario(datos, 'empresa-1')).rejects.toMatchObject({
      codigo: 'USUARIO_DUPLICADO',
      message: 'Ya existe una cuenta de acceso con ese correo.',
    });
    expect(mocks.consultar).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
