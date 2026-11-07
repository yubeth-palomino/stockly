export type PeriodoEvolucion = 'dia' | 'semana' | 'mes';
export type FiltroRangoEvolucion = 'hoy' | '7dias' | '30dias' | 'mes' | 'personalizado';

export type RangoFechas = {
  desde: string;
  hasta: string;
};

function desplazarDias(fecha: string, dias: number): string {
  const valor = new Date(`${fecha}T00:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

function diasIncluidos(rango: RangoFechas): number {
  return (Date.parse(`${rango.hasta}T00:00:00.000Z`) -
    Date.parse(`${rango.desde}T00:00:00.000Z`)) / 86_400_000 + 1;
}

export function obtenerRangoEvolucion(
  filtro: FiltroRangoEvolucion,
  hoy: string,
  personalizado?: RangoFechas,
): RangoFechas {
  if (filtro === 'hoy') return { desde: hoy, hasta: hoy };
  if (filtro === '7dias') return { desde: desplazarDias(hoy, -6), hasta: hoy };
  if (filtro === '30dias') return { desde: desplazarDias(hoy, -29), hasta: hoy };
  if (filtro === 'mes') return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
  if (!personalizado || personalizado.desde > personalizado.hasta) {
    throw new RangeError('Indica un rango de fechas personalizado válido.');
  }
  if (personalizado.hasta > hoy) {
    throw new RangeError('El rango de fechas no puede incluir días futuros.');
  }
  if (diasIncluidos(personalizado) > 366) {
    throw new RangeError('El rango personalizado no puede superar 366 días.');
  }
  return personalizado;
}

export function obtenerRangoAnterior(rango: RangoFechas): RangoFechas {
  const dias = diasIncluidos(rango);
  const hasta = desplazarDias(rango.desde, -1);
  return { desde: desplazarDias(hasta, -(dias - 1)), hasta };
}

export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return ((actual - anterior) / anterior) * 100;
}

export function calcularPromedioTicket(ingresos: number, cantidadTickets: number): number | null {
  if (cantidadTickets === 0) return null;
  return Math.round(ingresos / cantidadTickets);
}

export function inicioSemanaBogota(hoy: string): string {
  const dia = new Date(`${hoy}T00:00:00.000Z`).getUTCDay();
  return desplazarDias(hoy, -(dia === 0 ? 6 : dia - 1));
}

export function calcularIndicadoresEvolucion(entrada: {
  ingresos: number;
  ingresosAnteriores: number;
  unidades: number;
  tickets: number;
}) {
  return {
    promedioTicket: calcularPromedioTicket(entrada.ingresos, entrada.tickets),
    variacion: variacionPorcentual(entrada.ingresos, entrada.ingresosAnteriores),
  };
}
