const PREFIJO_INTERNO = '20';
const MAX_SECUENCIA = 9_999_999_999;

export function generarCodigoBarras(secuencia: string | number): string {
  const numero = typeof secuencia === 'number' ? secuencia : Number(secuencia);
  if (!Number.isSafeInteger(numero) || numero < 1 || numero > MAX_SECUENCIA) {
    throw new RangeError('La secuencia del código de barras está fuera del rango EAN-13.');
  }
  const cuerpo = `${PREFIJO_INTERNO}${String(numero).padStart(10, '0')}`;
  const suma = [...cuerpo].reduce(
    (total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 1 : 3),
    0,
  );
  return `${cuerpo}${(10 - (suma % 10)) % 10}`;
}

export function validarCodigoBarras(codigo: string): boolean {
  if (!/^2\d{12}$/.test(codigo)) return false;
  const cuerpo = codigo.slice(0, 12);
  const suma = [...cuerpo].reduce(
    (total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 1 : 3),
    0,
  );
  return Number(codigo[12]) === (10 - (suma % 10)) % 10;
}

const PATRONES_L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const PATRONES_G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const PATRONES_R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];
const PARIDAD_PRIMER_DIGITO = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

export function obtenerPatronEan13(codigo: string): string {
  if (!validarCodigoBarras(codigo)) {
    throw new Error('El código de barras EAN-13 no es válido.');
  }
  const paridad = PARIDAD_PRIMER_DIGITO[Number(codigo[0])];
  if (!paridad) throw new Error('No se pudo determinar la paridad del código EAN-13.');
  const izquierda = [...codigo.slice(1, 7)]
    .map((digito, indice) => {
      const numero = Number(digito);
      return paridad[indice] === 'G' ? PATRONES_G[numero] : PATRONES_L[numero];
    })
    .join('');
  const derecha = [...codigo.slice(7, 13)]
    .map((digito) => PATRONES_R[Number(digito)])
    .join('');
  return `101${izquierda}01010${derecha}101`;
}
