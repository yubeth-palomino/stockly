import { z } from 'zod';
import { ROLES } from '@/lib/config/stockly';
import { esFechaValida } from '@/lib/reglas/fechas';

const texto = (minimo: number, maximo: number) => z.string().trim().min(minimo).max(maximo);
const fecha = z.string().refine(esFechaValida, 'La fecha debe tener formato YYYY-MM-DD.');

export const esquemaEntradaProducto = z.object({
  referencia: texto(1, 60),
  marca: texto(2, 80),
  descripcion: texto(2, 200),
  talla: texto(1, 20),
  cantidad: z.number().int().min(1),
  precioVenta: z.number().int().min(1),
  precioCompra: z.number().int().min(1).optional(),
  fechaEntrada: fecha,
});

const camposCambiosProducto = z.object({
  marca: texto(2, 80).optional(),
  descripcion: texto(2, 200).optional(),
  precioVenta: z.number().int().min(1).optional(),
  precioCompra: z.number().int().min(1).optional(),
});

function tieneCambios(cambios: Record<string, unknown>): boolean {
  return Object.values(cambios).some((valor) => valor !== undefined);
}

export const esquemaCambiosProducto = camposCambiosProducto.refine(tieneCambios, {
  message: 'Debe indicar al menos un campo para actualizar.',
});

export const esquemaCambiosProductoTrabajador = camposCambiosProducto
  .omit({ precioCompra: true })
  .refine(tieneCambios, {
    message: 'Debe indicar al menos un campo para actualizar.',
  });

export const esquemaVenta = z.object({
  referencia: texto(1, 60),
  talla: texto(1, 20),
  cantidad: z.number().int().min(1),
});

export const esquemaFiltrosInventario = z.object({
  referencia: texto(1, 60).optional(),
  marca: texto(1, 80).optional(),
  talla: texto(1, 20).optional(),
  soloDisponibles: z.preprocess(
    (valor) => (valor === 'true' ? true : valor === 'false' ? false : valor),
    z.boolean().optional(),
  ),
});

export const esquemaUsuario = z.object({
  nombre: texto(2, 120),
  usuario: texto(3, 60),
  rol: z.enum(ROLES),
  authRef: z.string().uuid(),
});

export const esquemaCambiosUsuario = z
  .object({
    nombre: texto(2, 120).optional(),
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
  })
  .refine((cambios) => Object.values(cambios).some((valor) => valor !== undefined), {
    message: 'Debe indicar al menos un campo para actualizar.',
  });

export const esquemaFiltrosVentas = z
  .object({
    referencia: texto(1, 60).optional(),
    desde: fecha.optional(),
    hasta: fecha.optional(),
  })
  .refine(
    (filtros) =>
      filtros.desde === undefined || filtros.hasta === undefined || filtros.desde <= filtros.hasta,
    { message: 'La fecha inicial no puede ser posterior a la fecha final.' },
  );

export const esquemaFiltrosEconomia = z.object({
  marca: texto(1, 80).optional(),
});

export type EntradaProducto = z.infer<typeof esquemaEntradaProducto>;
export type CambiosProductoValidos = z.infer<typeof esquemaCambiosProducto>;
export type VentaValida = z.infer<typeof esquemaVenta>;
export type FiltrosInventarioValidos = z.infer<typeof esquemaFiltrosInventario>;
export type UsuarioValido = z.infer<typeof esquemaUsuario>;
export type CambiosUsuarioValidos = z.infer<typeof esquemaCambiosUsuario>;
export type FiltrosVentasValidos = z.infer<typeof esquemaFiltrosVentas>;
export type FiltrosEconomiaValidos = z.infer<typeof esquemaFiltrosEconomia>;
