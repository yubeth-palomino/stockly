import { describe, expect, it } from 'vitest';
import { rutaInternaSegura } from '@/lib/reglas/redireccion';

describe('rutaInternaSegura', () => {
  it('conserva una ruta local con parámetros y fragmento', () => {
    expect(rutaInternaSegura('/panel/inventario?marca=Stockly#lista'))
      .toBe('/panel/inventario?marca=Stockly#lista');
  });

  it('usa el panel por defecto para destinos externos o inválidos', () => {
    expect(rutaInternaSegura(undefined)).toBe('/panel');
    expect(rutaInternaSegura('https://example.com')).toBe('/panel');
    expect(rutaInternaSegura('//example.com')).toBe('/panel');
    expect(rutaInternaSegura('/\\example.com')).toBe('/panel');
  });
});
