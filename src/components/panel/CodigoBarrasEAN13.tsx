import { obtenerPatronEan13 } from '@/lib/reglas/codigoBarras';

export function CodigoBarrasEAN13({ codigo }: { codigo: string }) {
  const patron = obtenerPatronEan13(codigo);
  const barras: Array<{ inicio: number; largo: number }> = [];
  for (let indice = 0; indice < patron.length;) {
    if (patron[indice] === '0') {
      indice += 1;
      continue;
    }
    const inicio = indice;
    while (patron[indice] === '1') indice += 1;
    barras.push({ inicio, largo: indice - inicio });
  }

  return (
    <svg
      role="img"
      aria-label={`Código de barras ${codigo}`}
      viewBox="0 0 95 50"
      preserveAspectRatio="none"
    >
      {barras.map(({ inicio, largo }) => (
        <rect key={inicio} x={inicio} y="0" width={largo} height="48" fill="#171717" />
      ))}
    </svg>
  );
}
