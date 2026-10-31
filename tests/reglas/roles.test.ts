import { describe, expect, it } from 'vitest';
import { esDueno, puedeVerEconomia } from '@/lib/reglas/roles';

describe('reglas de roles', () => {
  it('T-20 identifica al dueño', () => {
    expect(esDueno('dueno')).toBe(true);
    expect(esDueno('trabajador')).toBe(false);
  });

  it('T-21 restringe economía al dueño', () => {
    expect(puedeVerEconomia('trabajador')).toBe(false);
    expect(puedeVerEconomia('dueno')).toBe(true);
  });
});
