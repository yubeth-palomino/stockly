import { describe, expect, it } from 'vitest';
import {
  esquemaFiltrosCuentas,
  esquemaFiltrosDashboardComercial,
  esquemaVenta,
} from '@/lib/validacion/esquemas';

describe('validación de operaciones comerciales', () => {
  it('exige cliente y fecha coherentes para ventas a crédito', () => {
    const base = {
      referencia: 'CAM001',
      talla: 'M',
      cantidad: 1,
      tipoPago: 'PAGADA' as const,
      pagos: [{ metodo: 'EFECTIVO' as const, monto: 50_000 }],
      claveIdempotencia: '00000000-0000-4000-8000-000000000001',
    };

    expect(esquemaVenta.safeParse({ ...base, fechaVencimiento: '2026-12-01' }).success).toBe(false);
    expect(
      esquemaVenta.safeParse({
        ...base,
        tipoPago: 'CREDITO',
        pagos: [],
      }).success,
    ).toBe(false);
    expect(
      esquemaVenta.safeParse({
        ...base,
        tipoPago: 'CREDITO',
        pagos: [],
        clienteId: '00000000-0000-4000-8000-000000000002',
      }).success,
    ).toBe(true);
  });

  it('rechaza filtros de fechas invertidos en cuentas y dashboard', () => {
    expect(
      esquemaFiltrosCuentas.safeParse({
        estado: 'TODAS',
        desde: '2026-12-02',
        hasta: '2026-12-01',
      }).success,
    ).toBe(false);
    expect(
      esquemaFiltrosDashboardComercial.safeParse({
        rango: 'personalizado',
        desde: '2026-12-02',
        hasta: '2026-12-01',
      }).success,
    ).toBe(false);
  });
});
