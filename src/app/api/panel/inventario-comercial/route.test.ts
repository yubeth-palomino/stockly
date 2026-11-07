import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  exigirDueno: vi.fn(),
  listarInventarioComercial: vi.fn(),
  crearProductoComercial: vi.fn(),
  ajustarExistenciasComercial: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({
  exigirUsuario: mocks.exigirUsuario,
  exigirDueno: mocks.exigirDueno,
}));
vi.mock('@/lib/dataService', () => ({
  listarInventarioComercial: mocks.listarInventarioComercial,
  crearProductoComercial: mocks.crearProductoComercial,
  ajustarExistenciasComercial: mocks.ajustarExistenciasComercial,
}));

import { GET as obtenerInventario } from './route';
import { POST as crearProducto } from './productos/route';
import { POST as ajustarInventario } from './ajustes/route';

const empresaId = '00000000-0000-4000-8000-000000000001';
const sucursalId = '00000000-0000-4000-8000-000000000002';
const varianteId = '00000000-0000-4000-8000-000000000005';
const claveIdempotencia = '00000000-0000-4000-8000-000000000006';

describe('/api/panel/inventario-comercial', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requiere sesión antes de consultar inventario por empresa', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await obtenerInventario(
      new Request(
        `http://localhost/api/panel/inventario-comercial?empresaId=${empresaId}&sucursalId=${sucursalId}`,
      ),
    );

    expect(response.status).toBe(401);
    expect(mocks.listarInventarioComercial).not.toHaveBeenCalled();
  });

  it('valida el ámbito solicitado y delega el rol autenticado', async () => {
    const usuario = { id: 'trabajador-id', nombre: 'Trabajador', rol: 'trabajador' as const };
    mocks.exigirUsuario.mockResolvedValue(usuario);
    mocks.listarInventarioComercial.mockResolvedValue([]);

    const response = await obtenerInventario(
      new Request(
        `http://localhost/api/panel/inventario-comercial?empresaId=${empresaId}&sucursalId=${sucursalId}&soloDisponibles=true`,
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.listarInventarioComercial).toHaveBeenCalledWith(
      { empresaId, sucursalId, soloDisponibles: true },
      usuario,
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rechaza la creación de variantes si el usuario no es dueño', async () => {
    mocks.exigirDueno.mockRejectedValue(new ErrorDeNegocio('SIN_PERMISO'));

    const response = await crearProducto(
      new Request('http://localhost/api/panel/inventario-comercial/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          sucursalId,
          referencia: 'CAM001',
          marca: 'Marca',
          descripcion: 'Camisa básica',
          variante: { talla: 'M', precioVenta: 50_000 },
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.crearProductoComercial).not.toHaveBeenCalled();
  });

  it('propaga el conflicto de una clave de idempotencia reutilizada', async () => {
    mocks.exigirDueno.mockResolvedValue({
      id: 'dueno-id',
      nombre: 'Dueño',
      rol: 'dueno',
    });
    mocks.ajustarExistenciasComercial.mockRejectedValue(
      new ErrorDeNegocio('IDEMPOTENCIA_CONFLICTO'),
    );

    const response = await ajustarInventario(
      new Request('http://localhost/api/panel/inventario-comercial/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          sucursalId,
          varianteId,
          delta: 2,
          costoUnitario: 30_000,
          motivo: 'Entrada revisada',
          claveIdempotencia,
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.ajustarExistenciasComercial).toHaveBeenCalledWith(
      expect.objectContaining({ varianteId, costoUnitario: 30_000 }),
      'dueno-id',
    );
  });
});
