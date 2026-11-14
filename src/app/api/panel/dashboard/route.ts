import { exigirDueno } from '@/lib/auth/sesion';
import { obtenerDashboardComercial } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';
import { obtenerRangoEvolucion } from '@/lib/reglas/evolucionVentas';
import { esquemaFiltrosDashboardComercial } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function obtenerDashboard(request: Request) {
  const usuario = await exigirDueno();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const filtros = esquemaFiltrosDashboardComercial.parse(parametros);
  const hoy = hoyBogota();
  const rango =
    filtros.rango === 'anio'
      ? { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy }
      : obtenerRangoEvolucion(
          filtros.rango === 'personalizado' ? 'personalizado' : filtros.rango,
          hoy,
          filtros.desde && filtros.hasta
            ? { desde: filtros.desde, hasta: filtros.hasta }
            : undefined,
        );
  return responderOk(await obtenerDashboardComercial(rango, hoy, usuario.rol));
}

export const GET = conManejoDeErrores(obtenerDashboard);
