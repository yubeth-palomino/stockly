import { describe, expect, it } from 'vitest';
import {
  calcularIndicadoresEvolucion,
  calcularPromedioTicket,
  inicioSemanaBogota,
  obtenerRangoAnterior,
  obtenerRangoEvolucion,
  variacionPorcentual,
} from '@/lib/reglas/evolucionVentas';

describe('reglas de evolución de ventas', () => {
  const hoy = '2026-11-07';

  it('calcula rangos predefinidos usando fechas de calendario', () => {
    expect(obtenerRangoEvolucion('7dias', hoy)).toEqual({
      desde: '2026-11-01',
      hasta: hoy,
    });
    expect(obtenerRangoEvolucion('mes', hoy)).toEqual({
      desde: '2026-11-01',
      hasta: hoy,
    });
  });

  it('calcula el periodo anterior con igual duración', () => {
    expect(obtenerRangoAnterior({ desde: '2026-11-01', hasta: '2026-11-07' })).toEqual({
      desde: '2026-10-25',
      hasta: '2026-10-31',
    });
  });

  it('rechaza rangos personalizados futuros o demasiado extensos', () => {
    expect(() =>
      obtenerRangoEvolucion('personalizado', hoy, {
        desde: '2026-11-08',
        hasta: '2026-11-08',
      }),
    ).toThrow('no puede incluir días futuros');
    expect(() =>
      obtenerRangoEvolucion('personalizado', hoy, {
        desde: '2025-11-06',
        hasta: hoy,
      }),
    ).toThrow('no puede superar 366 días');
  });

  it('calcula variación y ticket sin dividir por cero', () => {
    expect(variacionPorcentual(150, 100)).toBe(50);
    expect(variacionPorcentual(100, 0)).toBeNull();
    expect(calcularPromedioTicket(100_000, 3)).toBe(33_333);
    expect(calcularPromedioTicket(0, 0)).toBeNull();
    expect(
      calcularIndicadoresEvolucion({
        ingresos: 150_000,
        ingresosAnteriores: 100_000,
        unidades: 3,
        tickets: 3,
      }),
    ).toEqual({ promedioTicket: 50_000, variacion: 50 });
  });

  it('inicia la semana el lunes en fecha de calendario', () => {
    expect(inicioSemanaBogota('2026-11-07')).toBe('2026-11-02');
  });
});
