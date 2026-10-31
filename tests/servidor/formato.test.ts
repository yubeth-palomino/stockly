import { describe, expect, it } from 'vitest';
import { formatearCantidad, formatearFecha, formatearPesos } from '@/lib/formato';

describe('formato de valores', () => {
  it('formatea pesos colombianos sin decimales', () => {
    expect(formatearPesos(50_000)).toContain('50.000');
    expect(formatearPesos(50_000)).toContain('$');
  });

  it('formatea fechas YYYY-MM-DD en UTC', () => {
    expect(formatearFecha('2030-06-15')).toContain('15');
    expect(formatearFecha('2030-06-15')).toContain('2030');
    expect(() => formatearFecha('2030-02-30')).toThrow(RangeError);
  });

  it('formatea cantidades enteras con separador de miles', () => {
    expect(formatearCantidad(1_234)).toBe('1.234');
    expect(() => formatearCantidad(1.5)).toThrow(RangeError);
  });
});
