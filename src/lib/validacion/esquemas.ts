import { z } from 'zod';
import { ROLES } from '@/lib/config/stockly';
import { esFechaValida } from '@/lib/reglas/fechas';
import { validarCodigoBarras } from '@/lib/reglas/codigoBarras';

const texto = (minimo: number, maximo: number) =>
  z
    .string({ error: 'Este campo debe ser texto.' })
    .trim()
    .min(minimo, { error: `Debe tener al menos ${minimo} caracteres.` })
    .max(maximo, { error: `No puede superar ${maximo} caracteres.` });
const uuidComercial = (mensaje: string) =>
  z.string().uuid({ error: mensaje }).transform((valor) => valor.toLowerCase());
const enteroPositivo = (campo: string) =>
  z
    .number({ error: `${campo} debe ser un número.` })
    .int({ error: `${campo} debe ser un número entero.` })
    .min(1, { error: `${campo} debe ser mayor que cero.` })
    .max(2_147_483_647, { error: `${campo} supera el rango permitido.` });
const enteroComercialPositivo = (campo: string) =>
  enteroPositivo(campo).max(2_147_483_647, { error: `${campo} supera el rango permitido.` });
const fecha = z
  .string({ error: 'La fecha debe ser texto.' })
  .refine(esFechaValida, 'La fecha debe tener formato YYYY-MM-DD.');

export const esquemaEntradaProducto = z.object({
  referencia: texto(1, 60),
  marca: texto(2, 80),
  descripcion: texto(2, 200),
  talla: texto(1, 20),
  cantidad: enteroPositivo('La cantidad'),
  precioVenta: enteroPositivo('El precio de venta'),
  precioCompra: enteroPositivo('El precio de compra').optional(),
  fechaEntrada: fecha,
});

const camposCambiosProducto = z.object({
  marca: texto(2, 80).optional(),
  descripcion: texto(2, 200).optional(),
  precioVenta: enteroPositivo('El precio de venta').optional(),
  precioCompra: enteroPositivo('El precio de compra').optional(),
  stockMinimo: z.number().int().min(0).max(2_147_483_647).optional(),
});

function tieneCambios(cambios: Record<string, unknown>): boolean {
  return Object.values(cambios).some((valor) => valor !== undefined);
}

export const esquemaCambiosProducto = camposCambiosProducto.refine(tieneCambios, {
  message: 'Debe indicar al menos un campo para actualizar.',
});

export const esquemaCambiosProductoTrabajador = camposCambiosProducto
  .omit({ precioCompra: true, stockMinimo: true })
  .refine(tieneCambios, {
    message: 'Debe indicar al menos un campo para actualizar.',
  });

export const esquemaVenta = z.object({
  referencia: texto(1, 60),
  talla: texto(1, 20),
  cantidad: enteroPositivo('La cantidad'),
});

const esquemaVarianteComercial = z.object({
  talla: texto(1, 20),
  color: texto(1, 60).optional(),
  sku: texto(1, 80).optional(),
  codigoBarras: texto(1, 80).optional(),
  precioVenta: enteroComercialPositivo('El precio de venta'),
});

export const esquemaCrearProductoComercial = z.object({
  empresaId: uuidComercial('Seleccione una empresa válida.'),
  sucursalId: uuidComercial('Seleccione una sucursal válida.'),
  referencia: texto(1, 60),
  marca: texto(2, 80),
  descripcion: texto(2, 200),
  categoria: texto(2, 100).optional(),
  variante: esquemaVarianteComercial,
});

export const esquemaAjusteComercial = z
  .object({
    empresaId: uuidComercial('Seleccione una empresa válida.'),
    sucursalId: uuidComercial('Seleccione una sucursal válida.'),
    varianteId: uuidComercial('Seleccione una variante válida.'),
    delta: z
      .number({ error: 'La cantidad debe ser un número.' })
      .int({ error: 'La cantidad debe ser un número entero.' })
      .min(-2_147_483_647, { error: 'La cantidad supera el rango permitido.' })
      .max(2_147_483_647, { error: 'La cantidad supera el rango permitido.' })
      .refine((valor) => valor !== 0, 'La cantidad no puede ser cero.'),
    costoUnitario: enteroComercialPositivo('El costo unitario').optional(),
    motivo: texto(3, 300),
    claveIdempotencia: uuidComercial('La clave de operación no es válida.'),
  })
  .refine(
    (datos) =>
      datos.delta > 0
        ? datos.costoUnitario !== undefined
        : datos.costoUnitario === undefined,
    {
      path: ['costoUnitario'],
      message: 'Indique costo unitario solo para aumentos de existencias.',
    },
  );

const esquemaLineaVentaComercial = z.object({
  varianteId: uuidComercial('Seleccione una variante válida.'),
  cantidad: z
    .number({ error: 'La cantidad debe ser un número.' })
    .int({ error: 'La cantidad debe ser un número entero.' })
    .min(1, { error: 'La cantidad debe ser mayor que cero.' })
    .max(2_147_483_647, { error: 'La cantidad supera el rango permitido.' }),
  descuentoLinea: z
    .number({ error: 'El descuento debe ser un número.' })
    .int({ error: 'El descuento debe ser un número entero.' })
    .min(0, { error: 'El descuento no puede ser negativo.' })
    .max(Number.MAX_SAFE_INTEGER, { error: 'El descuento supera el rango permitido.' })
    .default(0),
});

const esquemaPagoComercial = z.object({
  metodo: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO'], {
    error: 'Seleccione un método de pago válido.',
  }),
  monto: z
    .number({ error: 'El pago debe ser un número.' })
    .int({ error: 'El pago debe ser un número entero.' })
    .min(1, { error: 'El pago debe ser mayor que cero.' })
    .max(Number.MAX_SAFE_INTEGER, { error: 'El pago supera el rango permitido.' }),
  referencia: texto(1, 120).optional(),
});

export const esquemaVentaComercial = z
  .object({
    empresaId: uuidComercial('Seleccione una empresa válida.'),
    sucursalId: uuidComercial('Seleccione una sucursal válida.'),
    lineas: z.array(esquemaLineaVentaComercial).min(1).max(100),
    pagos: z.array(esquemaPagoComercial).min(1).max(20),
    claveIdempotencia: uuidComercial('La clave de operación no es válida.'),
  })
  .superRefine((datos, contexto) => {
    const variantes = new Set<string>();
    datos.lineas.forEach((linea, indice) => {
      const varianteId = linea.varianteId.toLowerCase();
      if (variantes.has(varianteId)) {
        contexto.addIssue({
          code: 'custom',
          path: ['lineas', indice, 'varianteId'],
          message: 'No repita una variante; combine sus cantidades en una sola línea.',
        });
      }
      variantes.add(varianteId);
    });
  });

export const esquemaFiltrosInventario = z.object({
  referencia: texto(1, 60).optional(),
  codigoBarras: z.string().trim().refine(validarCodigoBarras, {
    message: 'El código EAN-13 no es válido.',
  }).optional(),
  marca: texto(1, 80).optional(),
  talla: texto(1, 20).optional(),
  soloDisponibles: z.preprocess(
    (valor) => (valor === 'true' ? true : valor === 'false' ? false : valor),
    z.boolean({ error: 'El filtro de disponibilidad debe ser verdadero o falso.' }).optional(),
  ),
});

export const esquemaFiltrosInventarioComercial = z.object({
  empresaId: uuidComercial('Seleccione una empresa válida.'),
  sucursalId: uuidComercial('Seleccione una sucursal válida.'),
  referencia: texto(1, 60).optional(),
  talla: texto(1, 20).optional(),
  color: texto(1, 60).optional(),
  soloDisponibles: z.preprocess(
    (valor) => (valor === 'true' ? true : valor === 'false' ? false : valor),
    z.boolean({ error: 'El filtro de disponibilidad debe ser verdadero o falso.' }).optional(),
  ),
});

export const esquemaUsuario = z.object({
  nombre: texto(2, 120),
  usuario: texto(3, 60),
  rol: z.enum(ROLES, { error: 'Seleccione un rol válido.' }),
  authRef: z
    .string({ error: 'El UUID de Supabase Auth debe ser texto.' })
    .uuid({ error: 'Ingrese un UUID válido de Supabase Auth.' }),
});

export const esquemaCambiosUsuario = z
  .object({
    nombre: texto(2, 120).optional(),
    rol: z.enum(ROLES, { error: 'Seleccione un rol válido.' }).optional(),
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

export const esquemaFiltrosKardex = z
  .object({
    desde: fecha.optional(),
    hasta: fecha.optional(),
    tipo: texto(1, 60).optional(),
  })
  .refine(
    (filtros) =>
      filtros.desde === undefined || filtros.hasta === undefined || filtros.desde <= filtros.hasta,
    { message: 'La fecha inicial no puede ser posterior a la fecha final.' },
  );

export const esquemaFiltrosEconomia = z.object({
  marca: texto(1, 80).optional(),
});

export const esquemaFiltrosEvolucion = z
  .object({
    rango: z.enum(['hoy', '7dias', '30dias', 'mes', 'personalizado']).default('30dias'),
    agrupacion: z.enum(['dia', 'semana', 'mes']).default('dia'),
    desde: fecha.optional(),
    hasta: fecha.optional(),
  })
  .superRefine((filtros, contexto) => {
    if (filtros.rango === 'personalizado' && (!filtros.desde || !filtros.hasta)) {
      contexto.addIssue({
        code: 'custom',
        message: 'Selecciona la fecha inicial y final del rango personalizado.',
        path: ['desde'],
      });
    }
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      contexto.addIssue({
        code: 'custom',
        message: 'La fecha inicial no puede ser posterior a la fecha final.',
        path: ['hasta'],
      });
    }
  });

export type EntradaProducto = z.infer<typeof esquemaEntradaProducto>;
export type CambiosProductoValidos = z.infer<typeof esquemaCambiosProducto>;
export type VentaValida = z.infer<typeof esquemaVenta>;
export type ProductoComercialValido = z.infer<typeof esquemaCrearProductoComercial>;
export type AjusteComercialValido = z.infer<typeof esquemaAjusteComercial>;
export type VentaComercialValida = z.infer<typeof esquemaVentaComercial>;
export type FiltrosInventarioValidos = z.infer<typeof esquemaFiltrosInventario>;
export type FiltrosInventarioComercialValidos = z.infer<typeof esquemaFiltrosInventarioComercial>;
export type UsuarioValido = z.infer<typeof esquemaUsuario>;
export type CambiosUsuarioValidos = z.infer<typeof esquemaCambiosUsuario>;
export type FiltrosVentasValidos = z.infer<typeof esquemaFiltrosVentas>;
export type FiltrosEconomiaValidos = z.infer<typeof esquemaFiltrosEconomia>;
export type FiltrosEvolucionValidos = z.infer<typeof esquemaFiltrosEvolucion>;
