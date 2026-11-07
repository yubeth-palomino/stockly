import { describe, expect, it } from 'vitest';
import {
  calcularCantidadAjustada,
  calcularCostoPromedioPonderado,
  claveVariante,
  normalizarColor,
  normalizarCodigoComercial,
  normalizarReferenciaComercial,
  normalizarTallaComercial,
} from '@/lib/reglas/comercial';
import { esquemaAjusteComercial, esquemaCrearProductoComercial } from '@/lib/validacion/esquemas';
import { esperarCodigo } from './ayudas';

const ids = {
  empresaId: '00000000-0000-4000-8000-000000000001',
  sucursalId: '00000000-0000-4000-8000-000000000002',
  varianteId: '00000000-0000-4000-8000-000000000005',
};

describe('reglas del inventario comercial', () => {
  it('normaliza referencia y talla sin espacios internos', () => {
    expect(normalizarReferenciaComercial(' ca m 001 ')).toBe('CAM001');
    expect(normalizarTallaComercial(' talla m ')).toBe('TALLAM');
  });

  it('normaliza el color conservando separadores legibles', () => {
    expect(normalizarColor(' azul   marino ')).toBe('AZUL MARINO');
    expect(normalizarColor('  ')).toBeNull();
  });

  it('normaliza códigos comerciales sin espacios', () => {
    expect(normalizarCodigoComercial(' ab 123 ')).toBe('AB123');
    expect(normalizarCodigoComercial('  ')).toBeNull();
  });

  it('forma la clave de variante incluyendo color', () => {
    expect(claveVariante('cam 001', 'talla m', 'azul marino')).toBe('CAM001|TALLAM|AZUL MARINO');
    expect(claveVariante('cam001', 'tallam')).toBe('CAM001|TALLAM|');
  });

  it('calcula el costo promedio ponderado en pesos enteros', () => {
    expect(
      calcularCostoPromedioPonderado({
        cantidadActual: 10,
        costoPromedioActual: 30_000,
        costoPromedioValidado: true,
        cantidadEntrada: 5,
        costoUnitarioEntrada: 60_000,
      }),
    ).toBe(40_000);
  });

  it('redondea el promedio .5 al peso siguiente', () => {
    expect(
      calcularCostoPromedioPonderado({
        cantidadActual: 1,
        costoPromedioActual: 1,
        costoPromedioValidado: true,
        cantidadEntrada: 1,
        costoUnitarioEntrada: 2,
      }),
    ).toBe(2);
  });

  it('usa el nuevo costo cuando no había existencias', () => {
    expect(
      calcularCostoPromedioPonderado({
        cantidadActual: 0,
        costoPromedioActual: null,
        costoPromedioValidado: false,
        cantidadEntrada: 3,
        costoUnitarioEntrada: 25_000,
      }),
    ).toBe(25_000);
  });

  it('no inventa el costo promedio faltante en existencias abiertas', () => {
    esperarCodigo(
      () =>
        calcularCostoPromedioPonderado({
          cantidadActual: 2,
          costoPromedioActual: null,
          costoPromedioValidado: false,
          cantidadEntrada: 1,
          costoUnitarioEntrada: 25_000,
        }),
      'COSTO_PROMEDIO_NO_REGISTRADO',
    );
  });

  it('no calcula el promedio con un costo inicial aun no validado', () => {
    esperarCodigo(
      () =>
        calcularCostoPromedioPonderado({
          cantidadActual: 2,
          costoPromedioActual: 25_000,
          costoPromedioValidado: false,
          cantidadEntrada: 1,
          costoUnitarioEntrada: 30_000,
        }),
      'COSTO_PROMEDIO_NO_REGISTRADO',
    );
  });

  it('rechaza cantidades negativas resultantes', () => {
    esperarCodigo(() => calcularCantidadAjustada(2, -3), 'STOCK_INSUFICIENTE');
  });

  it('calcula aumentos y disminuciones válidos', () => {
    expect(calcularCantidadAjustada(5, 3)).toBe(8);
    expect(calcularCantidadAjustada(5, -5)).toBe(0);
  });

  it('valida la creación de catálogo y variante', () => {
    expect(
      esquemaCrearProductoComercial.safeParse({
        ...ids,
        referencia: 'CAM001',
        marca: 'Marca',
        descripcion: 'Camisa básica',
        variante: { talla: 'M', color: 'Azul', precioVenta: 50_000 },
      }).success,
    ).toBe(true);
  });

  it('exige costo y clave idempotente para un ajuste positivo', () => {
    const ajuste = {
      ...ids,
      delta: 5,
      costoUnitario: 30_000,
      motivo: 'Entrada inicial',
      claveIdempotencia: '00000000-0000-4000-8000-000000000003',
    };

    expect(esquemaAjusteComercial.safeParse(ajuste).success).toBe(true);
    expect(esquemaAjusteComercial.safeParse({ ...ajuste, costoUnitario: undefined }).success).toBe(
      false,
    );
  });

  it('rechaza costo unitario en una disminución', () => {
    expect(
      esquemaAjusteComercial.safeParse({
        ...ids,
        delta: -1,
        costoUnitario: 30_000,
        motivo: 'Conteo físico',
        claveIdempotencia: '00000000-0000-4000-8000-000000000004',
      }).success,
    ).toBe(false);
  });
});
