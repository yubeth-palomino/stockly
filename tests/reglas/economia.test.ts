import { describe, expect, it } from 'vitest';
import {
  gananciaPorUnidad,
  gananciaPotencialProducto,
  gananciaRealizadaVenta,
  inversionProducto,
  validarPrecioCompra,
} from '@/lib/reglas/economia';
import { esperarCodigo } from './ayudas';

describe('reglas económicas preparadas para el módulo opcional', () => {
  it('T-24 rechaza un precio de compra cero', () => {
    esperarCodigo(() => validarPrecioCompra(0, 50_000), 'DATOS_INVALIDOS');
  });

  it('T-25 rechaza precio de venta igual al de compra', () => {
    esperarCodigo(
      () => validarPrecioCompra(50_000, 50_000),
      'PRECIO_VENTA_NO_SUPERA_COMPRA',
    );
  });

  it('T-26 rechaza precio de venta menor al de compra', () => {
    esperarCodigo(
      () => validarPrecioCompra(50_000, 40_000),
      'PRECIO_VENTA_NO_SUPERA_COMPRA',
    );
  });

  it('T-27 acepta precio de venta mayor al de compra', () => {
    expect(() => validarPrecioCompra(40_000, 50_000)).not.toThrow();
  });

  it('T-28 calcula ganancia por unidad', () => {
    expect(gananciaPorUnidad(50_000, 30_000)).toBe(20_000);
  });

  it('T-29 calcula inversión del producto', () => {
    expect(inversionProducto(30_000, 10)).toBe(300_000);
  });

  it('T-30 calcula ganancia potencial del producto', () => {
    expect(gananciaPotencialProducto(50_000, 30_000, 10)).toBe(200_000);
  });

  it('T-31 no calcula ganancia potencial sin existencias', () => {
    expect(gananciaPotencialProducto(50_000, 30_000, 0)).toBe(0);
  });

  it('T-32 calcula la ganancia realizada de una venta', () => {
    expect(gananciaRealizadaVenta(50_000, 30_000, 4)).toBe(80_000);
  });
});
