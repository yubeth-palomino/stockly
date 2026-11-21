// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardComercialPanel } from './DashboardComercialPanel';

function crearDatosDashboard(sinVentas = false) {
  const ventasRecientes = sinVentas
    ? []
    : Array.from({ length: 6 }, (_, indice) => ({
        id: indice + 1,
        referencia: `CAM00${indice + 1}`,
        talla: 'M',
        cantidad: 1,
        precioUnitario: 50_000,
        total: 50_000,
        fechaVenta: '2026-11-21',
        nombreUsuario: 'María',
      }));
  const serieSemana = [
    { fecha: '2026-11-16', vendido: sinVentas ? 0 : 50_000, transacciones: sinVentas ? 0 : 1 },
    { fecha: '2026-11-17', vendido: 0, transacciones: 0 },
    { fecha: '2026-11-18', vendido: 0, transacciones: 0 },
    { fecha: '2026-11-19', vendido: 0, transacciones: 0 },
    { fecha: '2026-11-20', vendido: 0, transacciones: 0 },
    { fecha: '2026-11-21', vendido: 0, transacciones: 0 },
    { fecha: '2026-11-22', vendido: 0, transacciones: 0 },
  ];

  return {
    filtros: { desde: '2026-11-01', hasta: '2026-11-21' },
    vendido: sinVentas ? 0 : 50_000,
    transacciones: sinVentas ? 0 : 1,
    promedioVenta: sinVentas ? null : 50_000,
    unidades: sinVentas ? 0 : 1,
    vendidoHoy: sinVentas ? 0 : 50_000,
    vendidoSemana: sinVentas ? 0 : 50_000,
    vendidoMes: sinVentas ? 0 : 50_000,
    ventasPagadas: sinVentas ? 0 : 1,
    ventasCredito: 0,
    valorVentasPagadas: sinVentas ? 0 : 50_000,
    valorVentasCredito: 0,
    pagosHistoricosSinClasificar: 0,
    pagosRecibidos: sinVentas ? 0 : 50_000,
    abonosRecibidos: 0,
    saldoPendiente: 0,
    clientesConSaldo: 0,
    pagosPorMetodo: [],
    serie: [],
    serieSemana,
    serieAbonos: [],
    seriesAgrupadas: [],
    productosMasVendidos: sinVentas
      ? []
      : [{ referencia: 'CAM001', talla: 'M', unidades: 1, vendido: 50_000 }],
    stockAgotado: 0,
    stockBajo: 0,
    ventasRecientes,
    cuentasPorVencer: [],
  };
}

function prepararFetch(sinVentas = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, datos: crearDatosDashboard(sinVentas) }),
    }),
  );
}

describe('DashboardComercialPanel', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('muestra los indicadores, las gráficas y solo las cinco ventas más recientes', async () => {
    prepararFetch();
    render(<DashboardComercialPanel />);

    expect(await screen.findByText('Total ventas hoy')).not.toBeNull();
    expect(screen.getByText('Total ventas del mes')).not.toBeNull();
    expect(screen.getByText('Número de ventas · período seleccionado')).not.toBeNull();
    expect(screen.getAllByText('CAM001').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: /Income por día/ })).not.toBeNull();
    expect(screen.getByRole('img', { name: /Growth, ventas por día/ })).not.toBeNull();

    const tabla = screen.getByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(6);
    expect(within(tabla).getAllByText('María')).toHaveLength(5);
  });

  it('muestra ceros y un estado vacío cuando no hay ventas', async () => {
    prepararFetch(true);
    render(<DashboardComercialPanel />);

    expect(await screen.findByText('Sin ventas')).not.toBeNull();
    expect(screen.getByText('No hay ventas registradas. Total: 0.')).not.toBeNull();
    expect(screen.getByRole('img', { name: /Income por día/ })).not.toBeNull();
  });
});
