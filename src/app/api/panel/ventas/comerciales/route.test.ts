import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirUsuario: vi.fn(),
  registrarVentaComercial: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirUsuario: mocks.exigirUsuario }));
vi.mock('@/lib/dataService', () => ({
  registrarVentaComercial: mocks.registrarVentaComercial,
}));

import { POST } from './route';

const empresaId = '00000000-0000-4000-8000-000000000001';
const sucursalId = '00000000-0000-4000-8000-000000000002';
const varianteId = '00000000-0000-4000-8000-000000000005';
const claveIdempotencia = '00000000-0000-4000-8000-000000000006';

describe('/api/panel/ventas/comerciales', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requiere sesión antes de procesar una venta', async () => {
    mocks.exigirUsuario.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    const response = await POST(
      new Request('http://localhost/api/panel/ventas/comerciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.registrarVentaComercial).not.toHaveBeenCalled();
  });

  it('registra una venta con varias líneas y pagos por el servicio transaccional', async () => {
    const usuario = { id: 'trabajador-id', nombre: 'Trabajador', rol: 'trabajador' as const };
    mocks.exigirUsuario.mockResolvedValue(usuario);
    mocks.registrarVentaComercial.mockResolvedValue({
      ventaId: 25,
      totalBruto: 100_000,
      descuentoTotal: 5_000,
      totalPagado: 95_000,
      repetida: false,
    });

    const response = await POST(
      new Request('http://localhost/api/panel/ventas/comerciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          sucursalId,
          lineas: [
            { varianteId, cantidad: 2, descuentoLinea: 5_000 },
            { varianteId: '00000000-0000-4000-8000-000000000007', cantidad: 1 },
          ],
          pagos: [
            { metodo: 'EFECTIVO', monto: 50_000 },
            { metodo: 'TRANSFERENCIA', monto: 45_000 },
          ],
          claveIdempotencia,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.datos.totalPagado).toBe(95_000);
    expect(mocks.registrarVentaComercial).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId,
        sucursalId,
        lineas: [
          { varianteId, cantidad: 2, descuentoLinea: 5_000 },
          {
            varianteId: '00000000-0000-4000-8000-000000000007',
            cantidad: 1,
            descuentoLinea: 0,
          },
        ],
      }),
      usuario.id,
    );
  });

  it('rechaza repetir una variante en líneas distintas', async () => {
    mocks.exigirUsuario.mockResolvedValue({
      id: 'trabajador-id',
      nombre: 'Trabajador',
      rol: 'trabajador',
    });

    const response = await POST(
      new Request('http://localhost/api/panel/ventas/comerciales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          sucursalId,
          lineas: [
            { varianteId, cantidad: 1 },
            { varianteId: varianteId.toUpperCase(), cantidad: 1 },
          ],
          pagos: [{ metodo: 'EFECTIVO', monto: 10_000 }],
          claveIdempotencia,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.registrarVentaComercial).not.toHaveBeenCalled();
  });
});
