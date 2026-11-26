import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  listarInventario: vi.fn(),
  registrarEntrada: vi.fn(),
  createAdminClient: vi.fn(),
  storageFrom: vi.fn(),
  subirFoto: vi.fn(),
  quitarFoto: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/dataService', () => ({
  listarInventario: mocks.listarInventario,
  registrarEntrada: mocks.registrarEntrada,
}));

import { GET, POST } from './route';

describe('/api/panel/productos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.storageFrom.mockReturnValue({
      upload: mocks.subirFoto,
      remove: mocks.quitarFoto,
    });
    mocks.createAdminClient.mockReturnValue({
      storage: { from: mocks.storageFrom },
    });
    mocks.subirFoto.mockResolvedValue({ error: null });
    mocks.quitarFoto.mockResolvedValue({ error: null });
  });

  it('responde 401 sin usuario y no consulta inventario', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await GET(new Request('http://localhost/api/panel/productos'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.codigo).toBe('NO_AUTORIZADO');
    expect(mocks.listarInventario).not.toHaveBeenCalled();
  });

  it('pasa el rol trabajador al servicio al filtrar inventario', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.listarInventario.mockResolvedValue([]);

    const response = await GET(
      new Request('http://localhost/api/panel/productos?soloDisponibles=true'),
    );

    expect(response.status).toBe(200);
    expect(mocks.listarInventario).toHaveBeenCalledWith({ soloDisponibles: true }, 'trabajador');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('ignora precioCompra enviado por un trabajador al registrar una entrada', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-trabajador',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });
    mocks.registrarEntrada.mockResolvedValue({
      productoId: '00000000-0000-4000-8000-000000000001',
      sumado: false,
      cantidadResultante: 5,
    });

    const response = await POST(
      new Request('http://localhost/api/panel/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referencia: 'CAM001',
          marca: 'Marca',
          descripcion: 'Descripción',
          talla: 'M',
          cantidad: 5,
          precioVenta: 50_000,
          precioCompra: -20_000,
          fechaEntrada: '2026-11-07',
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.registrarEntrada).toHaveBeenCalledWith(
      expect.not.objectContaining({ precioCompra: expect.any(Number) }),
      'usuario-trabajador',
      'trabajador',
    );
  });

  it('permite precioCompra solo cuando registra el dueño', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.registrarEntrada.mockResolvedValue({
      productoId: '00000000-0000-4000-8000-000000000001',
      sumado: false,
      cantidadResultante: 5,
    });

    const response = await POST(
      new Request('http://localhost/api/panel/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referencia: 'CAM001',
          marca: 'Marca',
          descripcion: 'Descripción',
          talla: 'M',
          cantidad: 5,
          precioVenta: 50_000,
          precioCompra: 20_000,
          fechaEntrada: '2026-11-07',
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.registrarEntrada).toHaveBeenCalledWith(
      expect.objectContaining({ precioCompra: 20_000 }),
      'usuario-dueno',
      'dueno',
    );
  });

  it('guarda la foto en el bucket privado y limpia la versión anterior', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
      empresaId: 'empresa-prueba',
    });
    mocks.registrarEntrada.mockResolvedValue({
      productoId: '00000000-0000-4000-8000-000000000001',
      sumado: true,
      cantidadResultante: 8,
      fotoPathAnterior: 'productos/empresa-prueba/anterior.jpg',
    });
    const formulario = new FormData();
    formulario.set(
      'datos',
      JSON.stringify({
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Descripción',
        talla: 'M',
        cantidad: 3,
        precioVenta: 50_000,
        fechaEntrada: '2026-11-07',
      }),
    );
    formulario.set(
      'foto',
      new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' }),
    );

    const response = await POST(
      new Request('http://localhost/api/panel/productos', {
        method: 'POST',
        body: formulario,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.storageFrom).toHaveBeenCalledWith('stockly-productos');
    expect(mocks.subirFoto).toHaveBeenCalledWith(
      expect.stringMatching(/^productos\/empresa-prueba\/.+\.jpg$/),
      expect.any(File),
      { cacheControl: '60', contentType: 'image/jpeg', upsert: false },
    );
    expect(mocks.registrarEntrada).toHaveBeenCalledWith(
      expect.objectContaining({ fotoPath: expect.stringMatching(/^productos\/empresa-prueba\//) }),
      'usuario-dueno',
      'dueno',
    );
    expect(mocks.quitarFoto).toHaveBeenCalledWith([
      'productos/empresa-prueba/anterior.jpg',
    ]);
    expect(body.datos).not.toHaveProperty('fotoPathAnterior');
  });

  it('rechaza archivos que no contienen una imagen JPEG', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'usuario-dueno',
      nombre: 'Dueño',
      rol: 'dueno',
      empresaId: 'empresa-prueba',
    });
    const formulario = new FormData();
    formulario.set(
      'datos',
      JSON.stringify({
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Descripción',
        talla: 'M',
        cantidad: 3,
        precioVenta: 50_000,
        fechaEntrada: '2026-11-07',
      }),
    );
    formulario.set(
      'foto',
      new File([new Uint8Array([0, 0, 0])], 'foto.jpg', { type: 'image/jpeg' }),
    );

    const response = await POST(
      new Request('http://localhost/api/panel/productos', {
        method: 'POST',
        body: formulario,
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.subirFoto).not.toHaveBeenCalled();
    expect(mocks.registrarEntrada).not.toHaveBeenCalled();
  });
});
