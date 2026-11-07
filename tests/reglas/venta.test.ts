import { describe, expect, it } from 'vitest';
import { cantidadTrasVenta, totalLineaVenta, validarVenta } from '@/lib/reglas/venta';
import { esperarCodigo } from './ayudas';

const ventaValida = { referencia: 'CAM001', talla: 'M', cantidad: 1 };

describe('reglas de venta', () => {
  it('T-12 rechaza una cantidad cero', () => {
    esperarCodigo(() => validarVenta({ ...ventaValida, cantidad: 0 }), 'DATOS_INVALIDOS');
  });

  it('T-13 rechaza una cantidad negativa', () => {
    esperarCodigo(() => validarVenta({ ...ventaValida, cantidad: -1 }), 'DATOS_INVALIDOS');
  });

  it('T-14 rechaza una referencia vacía', () => {
    esperarCodigo(
      () => validarVenta({ ...ventaValida, referencia: ' ' }),
      'DATOS_INVALIDOS',
    );
  });

  it('T-15 acepta datos de venta válidos', () => {
    expect(() => validarVenta(ventaValida)).not.toThrow();
  });

  it('T-16 descuenta una venta parcial', () => {
    expect(cantidadTrasVenta(10, 3)).toBe(7);
  });

  it('T-17 permite vender toda la cantidad disponible', () => {
    expect(cantidadTrasVenta(5, 5)).toBe(0);
  });

  it('T-18 rechaza vender más de lo disponible', () => {
    esperarCodigo(() => cantidadTrasVenta(2, 3), 'STOCK_INSUFICIENTE');
  });

  it('T-19 rechaza vender si no hay existencias', () => {
    esperarCodigo(() => cantidadTrasVenta(0, 1), 'STOCK_INSUFICIENTE');
  });

  it('calcula el total de una línea sin perder precisión en montos grandes', () => {
    expect(totalLineaVenta(2_147_483_647, 2_147_483_647)).toBe(
      4_611_686_014_132_420_609n,
    );
  });
});
