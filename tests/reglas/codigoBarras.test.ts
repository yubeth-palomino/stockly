import { describe, expect, it } from 'vitest';
import {
  generarCodigoBarras,
  obtenerPatronEan13,
  validarCodigoBarras,
} from '@/lib/reglas/codigoBarras';

describe('códigos EAN-13 internos', () => {
  it('genera el código con prefijo 2 y dígito verificador correcto', () => {
    const codigo = generarCodigoBarras(1);
    expect(codigo).toBe('2000000000015');
    expect(validarCodigoBarras(codigo)).toBe(true);
  });

  it('codifica exactamente 95 módulos para impresión', () => {
    expect(obtenerPatronEan13('2000000000015')).toHaveLength(95);
    expect(obtenerPatronEan13('2000000000015')).toMatch(/^[01]+$/);
  });

  it('rechaza valores fuera de secuencia y dígitos de control inválidos', () => {
    expect(() => generarCodigoBarras(0)).toThrow('fuera del rango');
    expect(validarCodigoBarras('2000000000016')).toBe(false);
    expect(() => obtenerPatronEan13('2000000000016')).toThrow('no es válido');
  });
});
