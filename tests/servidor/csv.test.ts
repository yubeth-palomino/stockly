import { describe, expect, it } from 'vitest';
import { generarCsv } from '@/lib/http/csv';

describe('generarCsv', () => {
  it('escapa comillas, separadores y celdas que podrían ser fórmulas', () => {
    expect(generarCsv([
      ['detalle', 'tipo'],
      ['entrada, "nueva"', '=SUM(A1:A2)'],
      ['nota', '  =1+1'],
    ])).toBe('\uFEFF"detalle","tipo"\r\n"entrada, ""nueva""","\'=SUM(A1:A2)"\r\n"nota","\'  =1+1"');
  });
});
