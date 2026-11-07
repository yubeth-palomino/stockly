import { describe, expect, it } from 'vitest';
import { esquemaEntradaProducto } from './esquemas';

const entradaValida = {
  referencia: 'CAM001',
  marca: 'Nike',
  descripcion: 'Camiseta',
  talla: 'M',
  cantidad: 10,
  precioVenta: 60_000,
  fechaEntrada: '2026-11-07',
};

describe('esquemaEntradaProducto', () => {
  it('informa en español cuando la cantidad es cero', () => {
    const resultado = esquemaEntradaProducto.safeParse({ ...entradaValida, cantidad: 0 });

    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error.issues[0]?.message).toBe('La cantidad debe ser mayor que cero.');
  });

  it('informa en español cuando la cantidad no es un número', () => {
    const resultado = esquemaEntradaProducto.safeParse({ ...entradaValida, cantidad: 'diez' });

    expect(resultado.success).toBe(false);
    if (resultado.success) return;
    expect(resultado.error.issues[0]?.message).toBe('La cantidad debe ser un número.');
  });
});
