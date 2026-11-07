import { describe, expect, it } from 'vitest';
import { formatearPesos } from './formato';

describe('formatearPesos', () => {
  it('formatea montos grandes exactos en pesos enteros', () => {
    expect(formatearPesos(4_611_686_014_132_410_609n)).toContain(
      '4.611.686.014.132.410.609',
    );
  });

  it('rechaza números que ya perdieron precisión entera', () => {
    expect(() => formatearPesos(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
