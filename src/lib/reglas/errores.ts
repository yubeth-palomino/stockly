export type CodigoError =
  | 'DATOS_INVALIDOS'
  | 'NO_AUTORIZADO'
  | 'SIN_PERMISO'
  | 'PRODUCTO_NO_ENCONTRADO'
  | 'PRODUCTO_DUPLICADO'
  | 'PRODUCTO_CON_VENTAS'
  | 'PRODUCTO_CON_EXISTENCIAS'
  | 'FECHA_FUTURA'
  | 'STOCK_INSUFICIENTE'
  | 'FUNCIONALIDAD_NO_ACTIVA'
  | 'IDEMPOTENCIA_CONFLICTO'
  | 'REFERENCIA_CATALOGO_INCONSISTENTE'
  | 'PAGO_VENTA_NO_COINCIDE'
  | 'USUARIO_DUPLICADO'
  | 'USUARIO_NO_ENCONTRADO'
  | 'ULTIMO_DUENO'
  | 'PRECIO_VENTA_NO_SUPERA_COMPRA'
  | 'COSTO_PROMEDIO_NO_REGISTRADO'
  | 'ERROR_INTERNO';

export const MENSAJES: Record<CodigoError, string> = {
  DATOS_INVALIDOS: 'Revise los datos ingresados.',
  NO_AUTORIZADO: 'Debe iniciar sesión.',
  SIN_PERMISO: 'No tiene permisos para realizar esta operación.',
  PRODUCTO_NO_ENCONTRADO: 'No existe un producto con esa referencia y talla.',
  PRODUCTO_DUPLICADO: 'Ya existe un producto con esa referencia y talla.',
  PRODUCTO_CON_VENTAS: 'El producto tiene ventas registradas y no se puede eliminar.',
  PRODUCTO_CON_EXISTENCIAS: 'El producto tiene unidades disponibles y no se puede desactivar.',
  FECHA_FUTURA: 'La fecha de entrada no puede ser posterior a hoy.',
  STOCK_INSUFICIENTE: 'No hay suficientes unidades disponibles.',
  FUNCIONALIDAD_NO_ACTIVA: 'El módulo comercial aún no está habilitado en esta base de datos.',
  IDEMPOTENCIA_CONFLICTO: 'La clave de operación ya fue usada con datos diferentes.',
  REFERENCIA_CATALOGO_INCONSISTENTE:
    'La referencia ya existe con datos de catálogo diferentes.',
  PAGO_VENTA_NO_COINCIDE: 'La suma de los pagos debe coincidir con el total de la venta.',
  USUARIO_DUPLICADO: 'Ya existe un usuario con ese nombre de usuario.',
  USUARIO_NO_ENCONTRADO: 'El usuario no existe.',
  ULTIMO_DUENO: 'No puede quitar el rol de dueño ni desactivar la única cuenta de dueño.',
  PRECIO_VENTA_NO_SUPERA_COMPRA: 'El precio de venta debe ser mayor que el precio de compra.',
  COSTO_PROMEDIO_NO_REGISTRADO:
    'Debe validar el costo promedio antes de agregar unidades a esta existencia.',
  ERROR_INTERNO: 'Ocurrió un error inesperado. Intente de nuevo.',
};

export const ESTADO_HTTP: Record<CodigoError, number> = {
  DATOS_INVALIDOS: 400,
  NO_AUTORIZADO: 401,
  SIN_PERMISO: 403,
  PRODUCTO_NO_ENCONTRADO: 404,
  PRODUCTO_DUPLICADO: 409,
  PRODUCTO_CON_VENTAS: 409,
  PRODUCTO_CON_EXISTENCIAS: 409,
  FECHA_FUTURA: 422,
  STOCK_INSUFICIENTE: 409,
  FUNCIONALIDAD_NO_ACTIVA: 503,
  IDEMPOTENCIA_CONFLICTO: 409,
  REFERENCIA_CATALOGO_INCONSISTENTE: 409,
  PAGO_VENTA_NO_COINCIDE: 422,
  USUARIO_DUPLICADO: 409,
  USUARIO_NO_ENCONTRADO: 404,
  ULTIMO_DUENO: 409,
  PRECIO_VENTA_NO_SUPERA_COMPRA: 422,
  COSTO_PROMEDIO_NO_REGISTRADO: 409,
  ERROR_INTERNO: 500,
};

function reemplazarDetalles(mensaje: string, detalles: unknown): string {
  if (detalles === null || typeof detalles !== 'object') return mensaje;

  return mensaje.replace(/\{([^{}]+)\}/g, (coincidencia, clave: string) => {
    if (!(clave in detalles)) return coincidencia;
    return String((detalles as Record<string, unknown>)[clave]);
  });
}

export class ErrorDeNegocio extends Error {
  constructor(
    public codigo: CodigoError,
    mensaje?: string,
    public detalles?: unknown,
  ) {
    super(reemplazarDetalles(mensaje ?? MENSAJES[codigo], detalles));
    this.name = 'ErrorDeNegocio';
  }
}
