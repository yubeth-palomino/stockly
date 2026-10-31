import { describe, expect, it } from 'vitest';
import {
  calcularDisponible,
  clave,
  normalizarReferencia,
  normalizarTalla,
  validarEntrada,
} from '@/lib/reglas/producto';
import { esperarCodigo } from './ayudas';

const entradaValida = {
  referencia: 'CAM001',
  marca: 'Marca',
  descripcion: 'Descripción',
  talla: 'M',
  cantidad: 1,
  precioVenta: 50_000,
  fechaEntrada: '2030-06-15',
  hoy: '2030-06-15',
};

describe('reglas de producto', () => {
  it('T-01 normaliza la referencia', () => {
    expect(normalizarReferencia(' cam001 ')).toBe('CAM001');
  });

  it('T-02 normaliza la talla', () => {
    expect(normalizarTalla(' m ')).toBe('M');
  });

  it('T-03 forma la clave normalizada de referencia y talla', () => {
    expect(clave('cam001', 'm')).toBe('CAM001|M');
  });

  it('T-04 calcula disponibilidad según la cantidad', () => {
    expect(calcularDisponible(0)).toBe(false);
    expect(calcularDisponible(1)).toBe(true);
  });

  it('T-05 rechaza una cantidad cero', () => {
    esperarCodigo(() => validarEntrada({ ...entradaValida, cantidad: 0 }), 'DATOS_INVALIDOS');
  });

  it('T-06 rechaza una cantidad negativa', () => {
    esperarCodigo(() => validarEntrada({ ...entradaValida, cantidad: -3 }), 'DATOS_INVALIDOS');
  });

  it('T-07 rechaza una cantidad fraccionaria', () => {
    esperarCodigo(() => validarEntrada({ ...entradaValida, cantidad: 2.5 }), 'DATOS_INVALIDOS');
  });

  it('T-08 rechaza un precio de venta cero', () => {
    esperarCodigo(() => validarEntrada({ ...entradaValida, precioVenta: 0 }), 'DATOS_INVALIDOS');
  });

  it('T-09 rechaza una referencia vacía', () => {
    esperarCodigo(
      () => validarEntrada({ ...entradaValida, referencia: '  ' }),
      'DATOS_INVALIDOS',
    );
  });

  it('T-10 rechaza una fecha futura', () => {
    esperarCodigo(
      () => validarEntrada({ ...entradaValida, fechaEntrada: '2030-06-16' }),
      'FECHA_FUTURA',
    );
  });

  it('T-11 acepta una entrada válida de hoy', () => {
    expect(() => validarEntrada(entradaValida)).not.toThrow();
  });
});
