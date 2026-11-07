function protegerFormula(valor: string): string {
  return /^\s*[=+\-@]/.test(valor) ? `'${valor}` : valor;
}

export function generarCsv(filas: Array<Array<string | number | null>>): string {
  return `\uFEFF${filas
    .map((fila) => fila.map((celda) => {
      const valor = protegerFormula(String(celda ?? ''));
      return `"${valor.replaceAll('"', '""')}"`;
    }).join(','))
    .join('\r\n')}`;
}
