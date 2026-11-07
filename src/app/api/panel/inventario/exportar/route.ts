import { exigirUsuario } from '@/lib/auth/sesion';
import { exportarInventario } from '@/lib/dataService';
import { generarCsv } from '@/lib/http/csv';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { esquemaFiltrosInventario } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

async function exportar(request: Request): Promise<Response> {
  const usuario = await exigirUsuario();
  const parametros = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = esquemaFiltrosInventario.parse(parametros);
  const productos = await exportarInventario({
    ...(parsed.referencia !== undefined ? { referencia: parsed.referencia } : {}),
    ...(parsed.codigoBarras !== undefined ? { codigoBarras: parsed.codigoBarras } : {}),
    ...(parsed.marca !== undefined ? { marca: parsed.marca } : {}),
    ...(parsed.talla !== undefined ? { talla: parsed.talla } : {}),
    ...(parsed.soloDisponibles !== undefined ? { soloDisponibles: parsed.soloDisponibles } : {}),
  }, usuario.rol);
  const encabezados = [
    'referencia', 'marca', 'descripcion', 'talla', 'cantidad',
    'precio_venta', ...(usuario.rol === 'dueno' ? ['precio_compra'] : []),
    'codigo_barras', 'stock_minimo',
  ];
  const filas = productos.map((producto) => [
    producto.referencia,
    producto.marca,
    producto.descripcion,
    producto.talla,
    producto.cantidad,
    producto.precioVenta,
    ...(usuario.rol === 'dueno' ? [producto.precioCompra ?? ''] : []),
    producto.codigoBarras ?? '',
    producto.stockMinimo ?? '',
  ]);
  return new Response(generarCsv([encabezados, ...filas]), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="inventario-stockly.csv"',
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}

export const GET = conManejoDeErrores(exportar);
