import { describe, expect, it } from 'vitest';
import { esFechaFutura, hoyBogota } from '@/lib/reglas/fechas';

describe('reglas de fecha', () => {
  it('T-22 identifica una fecha posterior a hoy', () => {
    expect(esFechaFutura('2030-06-16', '2030-06-15')).toBe(true);
    expect(hoyBogota(new Date('2030-06-15T04:30:00.000Z'))).toBe('2030-06-14');
  });

  it('T-23 no considera hoy como fecha futura', () => {
    expect(esFechaFutura('2030-06-15', '2030-06-15')).toBe(false);
  });
});
