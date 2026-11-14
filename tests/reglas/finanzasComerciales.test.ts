import { describe, expect, it } from 'vitest';
import {
  calcularEfectivoEsperado,
  calcularSaldoPendiente,
  validarPagosVenta,
} from '@/lib/reglas/finanzasComerciales';

describe('reglas financieras comerciales', () => {
  it('separa efectivo de transferencias y calcula el saldo de una venta a crédito', () => {
    expect(
      calcularEfectivoEsperado(100_000, [
        { tipo: 'INGRESO', metodo: 'EFECTIVO', monto: 25_000 },
        { tipo: 'INGRESO', metodo: 'TRANSFERENCIA', monto: 60_000 },
        { tipo: 'EGRESO', metodo: 'EFECTIVO', monto: 10_000 },
      ]),
    ).toBe(115_000);
    expect(validarPagosVenta(100_000, [{ metodo: 'EFECTIVO', monto: 25_000 }], true)).toEqual({
      totalPagado: 25_000,
      saldoPendiente: 75_000,
    });
  });

  it('rechaza pagos incompletos sin crédito y abonos que exceden el saldo', () => {
    expect(() => validarPagosVenta(100_000, [{ metodo: 'EFECTIVO', monto: 99_999 }], false))
      .toThrowError();
    expect(() => calcularSaldoPendiente(100_000, [40_000, 60_001]))
      .toThrowError();
  });
});
