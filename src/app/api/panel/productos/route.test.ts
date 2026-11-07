import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  listarInventario: vi.fn(),
  registrarEntrada: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({
  listarInventario: mocks.listarInventario,
  registrarEntrada: mocks.registrarEntrada,
}));

import { GET, POST } from './route';

describe('/api/panel/productos', () => {
  beforeEach(() => vi.resetAllMocks());

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
});
