import { exigirUsuario } from '@/lib/auth/sesion';
import { exportarVentas } from '@/lib/dataService';
import { generarCsv } from '@/lib/http/csv';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { esquemaFiltrosVentas } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function exportar(request: Request): Promise<Response> {
  await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = esquemaFiltrosVentas.parse(parametros);
  const filtros = {
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.desde !== undefined ? { desde: parsed.desde } : {}),
    ...(parsed.hasta !== undefined ? { hasta: parsed.hasta } : {}),
  };
  const ventas = await exportarVentas(filtros);
  const filas = ventas.map((venta) => [
    venta.id,
    venta.fechaVenta,
    venta.referencia,
    venta.talla,
    venta.cantidad,
    venta.precioVenta,
  ]);
  return new Response(generarCsv([
    ['id', 'fecha', 'referencia', 'talla', 'cantidad', 'precio_venta'],
    ...filas,
  ]), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="ventas-stockly.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}

export const GET = conManejoDeErrores(exportar);
