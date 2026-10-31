import { expect } from 'vitest';
import type { CodigoError } from '@/lib/reglas/errores';

export function esperarCodigo(fn: () => unknown, codigo: CodigoError): void {
  try {
    fn();
  } catch (error) {
    expect(error).toMatchObject({ codigo });
    return;
  }

  throw new Error(`Se esperaba el código de error ${codigo}.`);
}
