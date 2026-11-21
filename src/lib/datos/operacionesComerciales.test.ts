import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
}));

vi.mock('@/lib/db/conexion', () => ({
  consultar: mocks.consultar,
}));

import { obtenerDashboardComercial } from './operacionesComerciales';

describe('dashboard comercial', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.consultar.mockImplementation(async (sql: string) => {
      if (sql.includes('AS "ventasPagadas"')) {
        return [{
          vendido: '100',
          transacciones: '1',
          unidades: '1',
          hoy: '90',
          semana: '80',
          mes: '70',
          ventasPagadas: '1',
          ventasCredito: '0',
          valorVentasPagadas: '100',
          valorVentasCredito: '0',
          sinClasificar: '0',
        }];
      }
      if (sql.includes('AS clientes')) return [{ saldo: '0', clientes: '0' }];
      if (sql.includes('AS "stockBajo"')) return [{ agotados: '0', stockBajo: '0' }];
      return [];
    });
  });

  it('calcula hoy, semana y mes fuera del rango seleccionado', async () => {
    const resultado = await obtenerDashboardComercial(
      { desde: '2020-01-01', hasta: '2020-01-02' },
      '2026-11-21',
      'dueno',
    );

    expect(resultado.vendidoHoy).toBe(90);
    expect(resultado.vendidoSemana).toBe(80);
    expect(resultado.vendidoMes).toBe(70);
    const consultaTotales = mocks.consultar.mock.calls.find(([sql]) =>
      sql.includes('AS "ventasPagadas"'),
    );
    expect(consultaTotales?.[0]).toContain(
      'FROM public.ventas WHERE fecha_venta = $3::date',
    );
    expect(consultaTotales?.[0]).toContain(
      'FROM public.ventas WHERE fecha_venta BETWEEN $4::date AND $3::date',
    );
    expect(consultaTotales?.[0]).toContain(
      'FROM public.ventas WHERE fecha_venta BETWEEN $5::date AND $3::date',
    );
  });
});
