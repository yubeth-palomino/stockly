import { exigirUsuario } from '@/lib/auth/sesion';
import { obtenerProducto } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { esquemaFiltrosKardex } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ParametrosRuta = { params: Promise<{ id: string }> };

function celdaCsv(valor: string): string {
  const protegido = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${protegido.replaceAll('"', '""')}"`;
}

async function exportarKardex(request: Request, contexto: ParametrosRuta): Promise<Response> {
  const usuario = await exigirUsuario();
  const { id } = await contexto.params;
  const productoId = z.string().uuid().parse(id);
  const parametros = new URL(request.url).searchParams;
  const filtros = esquemaFiltrosKardex.parse({
    ...(parametros.has('desde') ? { desde: parametros.get('desde') } : {}),
    ...(parametros.has('hasta') ? { hasta: parametros.get('hasta') } : {}),
    ...(parametros.has('tipo') ? { tipo: parametros.get('tipo') } : {}),
  });
  const producto = await obtenerProducto(productoId, usuario.rol, usuario.id, filtros);
  const filas = [
    ['id', 'fecha', 'tipo', 'detalle'],
    ...producto.eventos.map((evento) => [
      String(evento.id),
      evento.createdAt,
      evento.tipo,
      JSON.stringify(evento.detalle),
    ]),
  ];
  const csv = `\uFEFF${filas.map((fila) => fila.map(celdaCsv).join(',')).join('\r\n')}`;
  return new Response(csv, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="kardex-${producto.id}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}

export const GET = conManejoDeErrores(exportarKardex);
