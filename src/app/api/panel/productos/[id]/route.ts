import { exigirUsuario } from '@/lib/auth/sesion';
import { actualizarProducto, obtenerProducto } from '@/lib/dataService';
import type { CambiosProducto } from '@/lib/datos/tipos';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import {
  esquemaCambiosProducto,
  esquemaCambiosProductoTrabajador,
} from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type ParametrosRuta = { params: Promise<{ id: string }> };

async function obtenerDetalle(_request: Request, contexto: ParametrosRuta) {
  const usuario = await exigirUsuario();
  const { id } = await contexto.params;
  const productoId = z.string().uuid().parse(id);
  return responderOk(await obtenerProducto(productoId, usuario.rol, usuario.id));
}

async function editarProducto(request: Request, contexto: ParametrosRuta) {
  const usuario = await exigirUsuario();
  const { id } = await contexto.params;
  const productoId = z.string().uuid().parse(id);
  let cambios: CambiosProducto;
  if (usuario.rol === 'dueno') {
    const parsed = await leerCuerpo(request, esquemaCambiosProducto);
    cambios = {
      ...(parsed.marca !== undefined ? { marca: parsed.marca } : {}),
      ...(parsed.descripcion !== undefined ? { descripcion: parsed.descripcion } : {}),
      ...(parsed.precioVenta !== undefined ? { precioVenta: parsed.precioVenta } : {}),
      ...(parsed.precioCompra !== undefined ? { precioCompra: parsed.precioCompra } : {}),
      ...(parsed.stockMinimo !== undefined ? { stockMinimo: parsed.stockMinimo } : {}),
    };
  } else {
    const parsed = await leerCuerpo(request, esquemaCambiosProductoTrabajador);
    cambios = {
      ...(parsed.marca !== undefined ? { marca: parsed.marca } : {}),
      ...(parsed.descripcion !== undefined ? { descripcion: parsed.descripcion } : {}),
      ...(parsed.precioVenta !== undefined ? { precioVenta: parsed.precioVenta } : {}),
    };
  }
  await actualizarProducto(productoId, cambios, usuario.id, usuario.rol);
  return responderOk({ actualizado: true });
}

export const GET = conManejoDeErrores(obtenerDetalle);
export const PATCH = conManejoDeErrores(editarProducto);
