import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
  query: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  consultar: mocks.consultar,
  conTransaccion: async (
    trabajo: (tx: { query: typeof mocks.query }) => Promise<unknown>,
  ) => trabajo({ query: mocks.query }),
}));

import { ajustarExistenciasComercial, registrarVentaComercial } from './comercial';
import { esquemaAjusteComercial, esquemaVentaComercial } from '@/lib/validacion/esquemas';

const usuarioId = '00000000-0000-4000-8000-000000000003';
const empresaId = '00000000-0000-4000-8000-000000000001';
const sucursalId = '00000000-0000-4000-8000-000000000002';
const varianteId = '00000000-0000-4000-8000-000000000005';
const claveIdempotencia = '00000000-0000-4000-8000-000000000006';

describe('operaciones comerciales transaccionales', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass')) return { rows: [{ disponible: true }] };
      if (sql.includes('FROM empresas_usuarios')) return { rows: [{ rol: 'dueno' }] };
      return { rows: [] };
    });
  });

  it('pondera el costo y registra un ajuste con saldo antes y después', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass')) return { rows: [{ disponible: true }] };
      if (sql.includes('FROM empresas_usuarios')) return { rows: [{ rol: 'dueno' }] };
      if (sql.includes('FROM movimientos_inventario')) return { rows: [] };
      if (sql.includes('FROM existencias')) {
        return {
          rows: [{ cantidad: 10, costoPromedio: 20_000, costoPromedioValidado: true }],
        };
      }
      return { rows: [] };
    });

    const resultado = await ajustarExistenciasComercial(
      esquemaAjusteComercial.parse({
        empresaId,
        sucursalId,
        varianteId,
        delta: 5,
        costoUnitario: 30_000,
        motivo: 'Recepción verificada',
        claveIdempotencia,
      }),
      usuarioId,
    );

    expect(resultado).toEqual({ varianteId, cantidad: 15, repetida: false });
    const actualizacion = mocks.query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE existencias'),
    );
    expect(actualizacion?.[1]).toEqual([15, 23_333, true, empresaId, sucursalId, varianteId]);
    const movimiento = mocks.query.mock.calls.find(([sql]) =>
      sql.includes('INSERT INTO movimientos_inventario'),
    );
    expect(movimiento?.[1]).toEqual([
      empresaId,
      sucursalId,
      varianteId,
      usuarioId,
      10,
      5,
      15,
      30_000,
      'Recepción verificada',
      claveIdempotencia,
    ]);
  });

  it('no modifica existencias cuando el costo base importado no está validado', async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass')) return { rows: [{ disponible: true }] };
      if (sql.includes('FROM empresas_usuarios')) return { rows: [{ rol: 'dueno' }] };
      if (sql.includes('FROM movimientos_inventario')) return { rows: [] };
      if (sql.includes('FROM existencias')) {
        return {
          rows: [{ cantidad: 4, costoPromedio: 18_000, costoPromedioValidado: false }],
        };
      }
      return { rows: [] };
    });

    await expect(
      ajustarExistenciasComercial(
        esquemaAjusteComercial.parse({
          empresaId,
          sucursalId,
          varianteId,
          delta: 1,
          costoUnitario: 20_000,
          motivo: 'Entrada',
          claveIdempotencia,
        }),
        usuarioId,
      ),
    ).rejects.toMatchObject({ codigo: 'COSTO_PROMEDIO_NO_REGISTRADO' });
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('UPDATE existencias'))).toBe(false);
    expect(
      mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO movimientos_inventario')),
    ).toBe(false);
  });

  it('crea venta multi-línea, descuenta stock y conserva costos validados', async () => {
    const segundaVarianteId = '00000000-0000-4000-8000-000000000007';
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass')) return { rows: [{ disponible: true }] };
      if (sql.includes('FROM empresas_usuarios')) return { rows: [{ rol: 'trabajador' }] };
      if (sql.includes('FROM ventas_comerciales')) return { rows: [] };
      if (sql.includes('FROM existencias e')) {
        return {
          rows: [
            {
              varianteId,
              referencia: 'CAM001',
              talla: 'M',
              color: 'AZUL',
              precioVenta: 50_000,
              cantidad: 4,
              costoPromedio: 20_000,
              costoPromedioValidado: true,
            },
            {
              varianteId: segundaVarianteId,
              referencia: 'CAM002',
              talla: 'S',
              color: null,
              precioVenta: 30_000,
              cantidad: 3,
              costoPromedio: null,
              costoPromedioValidado: false,
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO ventas_comerciales (')) {
        return {
          rows: [
            {
              id: 25,
              huellaIdempotencia: 'huella',
              totalBruto: 80_000,
              descuentoTotal: 5_000,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const resultado = await registrarVentaComercial(
      esquemaVentaComercial.parse({
        empresaId,
        sucursalId,
        lineas: [
          { varianteId, cantidad: 1, descuentoLinea: 5_000 },
          { varianteId: segundaVarianteId, cantidad: 1 },
        ],
        pagos: [{ metodo: 'EFECTIVO', monto: 75_000 }],
        claveIdempotencia,
      }),
      usuarioId,
    );

    expect(resultado).toEqual({
      ventaId: 25,
      totalBruto: 80_000,
      descuentoTotal: 5_000,
      totalPagado: 75_000,
      repetida: false,
    });
    const detalles = mocks.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO ventas_comerciales_detalle'),
    );
    expect(detalles).toHaveLength(2);
    expect(detalles[0]?.[1]).toContain('REGISTRADO');
    expect(detalles[1]?.[1]).toContain('NO_REGISTRADO');
    const movimientos = mocks.query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO movimientos_inventario'),
    );
    expect(movimientos.map(([, valores]) => valores?.slice(4, 8))).toEqual([
      [4, -1, 3, 20_000],
      [3, -1, 2, null],
    ]);
  });

  it('no registra venta si los pagos no cubren el total', async () => {
    const id2 = '00000000-0000-4000-8000-000000000007';
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('to_regclass')) return { rows: [{ disponible: true }] };
      if (sql.includes('FROM empresas_usuarios')) return { rows: [{ rol: 'trabajador' }] };
      if (sql.includes('FROM ventas_comerciales')) return { rows: [] };
      if (sql.includes('FROM existencias e')) {
        return {
          rows: [
            {
              varianteId,
              referencia: 'CAM001',
              talla: 'M',
              color: null,
              precioVenta: 50_000,
              cantidad: 2,
              costoPromedio: 20_000,
              costoPromedioValidado: true,
            },
            {
              varianteId: id2,
              referencia: 'CAM002',
              talla: 'S',
              color: null,
              precioVenta: 30_000,
              cantidad: 2,
              costoPromedio: 20_000,
              costoPromedioValidado: true,
            },
          ],
        };
      }
      return { rows: [] };
    });

    await expect(
      registrarVentaComercial(
        esquemaVentaComercial.parse({
          empresaId,
          sucursalId,
          lineas: [
            { varianteId, cantidad: 1 },
            { varianteId: id2, cantidad: 1 },
          ],
          pagos: [{ metodo: 'EFECTIVO', monto: 79_999 }],
          claveIdempotencia,
        }),
        usuarioId,
      ),
    ).rejects.toMatchObject({ codigo: 'PAGO_VENTA_NO_COINCIDE' });
    expect(
      mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO ventas_comerciales (')),
    ).toBe(false);
  });
});
