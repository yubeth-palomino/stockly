import { conTransaccion, consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { normalizarReferencia, normalizarTalla, validarEntrada } from '@/lib/reglas/producto';
import { generarCodigoBarras } from '@/lib/reglas/codigoBarras';
import {
  gananciaPotencialProducto,
  inversionProducto,
  validarPrecioCompra,
} from '@/lib/reglas/economia';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { registrarEvento } from '@/lib/datos/eventos';
import type {
  CambiosProducto,
  DatosEntrada,
  DetalleProducto,
  FilaEvento,
  FilaProducto,
  FilaVenta,
  FiltrosKardex,
} from '@/lib/datos/tipos';
import type { Rol } from '@/lib/reglas/roles';

type FilaId = { id: string };
type FilaSecuencia = { secuencia: string };
type FilaCantidad = {
  id: string;
  cantidad: number;
  referencia?: string;
  precioVenta?: number;
};
type ErrorPostgres = { code?: string; constraint?: string };

function esErrorPostgres(error: unknown): error is ErrorPostgres {
  return typeof error === 'object' && error !== null && 'code' in error;
}

function traducirErrorProducto(error: unknown): never {
  if (
    esErrorPostgres(error) &&
    error.code === '23505' &&
    error.constraint === 'ux_productos_ref_talla'
  ) {
    throw new ErrorDeNegocio('PRODUCTO_DUPLICADO');
  }
  if (
    esErrorPostgres(error) &&
    error.code === '23503' &&
    error.constraint === 'ventas_producto_id_fkey'
  ) {
    throw new ErrorDeNegocio('PRODUCTO_CON_VENTAS');
  }
  throw error;
}

export function columnasProducto(rol: Rol): string {
  const columnas = [
    'id',
    'referencia',
    'marca',
    'descripcion',
    'talla',
    'cantidad',
    'precio_venta AS "precioVenta"',
    'fecha_entrada AS "fechaEntrada"',
    'activo',
    'disponible',
    'codigo_barras AS "codigoBarras"',
    'stock_minimo AS "stockMinimo"',
  ];
  if (rol === 'dueno') columnas.push('precio_compra AS "precioCompra"');
  return columnas.join(', ');
}

function filtrosInventario(filtros: {
  referencia?: string;
  codigoBarras?: string;
  marca?: string;
  talla?: string;
  soloDisponibles?: boolean;
}): { condiciones: string[]; valores: Array<string | boolean | number> } {
  const condiciones = ['activo = true'];
  const valores: Array<string | boolean | number> = [];

  if (filtros.referencia?.trim()) {
    valores.push(`%${normalizarReferencia(filtros.referencia)}%`);
    condiciones.push(`clave_referencia LIKE $${valores.length}`);
  }
  if (filtros.codigoBarras?.trim()) {
    valores.push(filtros.codigoBarras.trim());
    condiciones.push(`codigo_barras = $${valores.length}`);
  }
  if (filtros.marca?.trim()) {
    valores.push(`%${filtros.marca.trim().toLowerCase()}%`);
    condiciones.push(`lower(marca) LIKE $${valores.length}`);
  }
  if (filtros.talla?.trim()) {
    valores.push(`%${normalizarTalla(filtros.talla)}%`);
    condiciones.push(`clave_talla LIKE $${valores.length}`);
  }
  if (filtros.soloDisponibles === true) condiciones.push('cantidad > 0');

  return { condiciones, valores };
}

export async function registrarEntrada(
  datos: DatosEntrada,
  usuarioId: string,
  rol: Rol = 'trabajador',
): Promise<{ productoId: string; sumado: boolean; cantidadResultante: number }> {
  validarEntrada({ ...datos, hoy: hoyBogota() });
  const precioCompra = rol === 'dueno' ? datos.precioCompra : undefined;

  try {
    return await conTransaccion(async (tx) => {
      const referenciaNormalizada = normalizarReferencia(datos.referencia);
      const tallaNormalizada = normalizarTalla(datos.talla);
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [
        referenciaNormalizada,
        tallaNormalizada,
      ]);

      const existentes = await tx.query<FilaCantidad>(
        `SELECT id, cantidad, precio_venta AS "precioVenta" FROM productos
         WHERE clave_referencia = $1 AND clave_talla = $2 AND activo = true
         FOR UPDATE`,
        [referenciaNormalizada, tallaNormalizada],
      );
      const existente = existentes.rows[0];

      if (existente) {
        if (precioCompra !== undefined) {
          if (existente.precioVenta === undefined) {
            throw new Error('No se pudo leer el precio de venta del producto existente.');
          }
          validarPrecioCompra(precioCompra, existente.precioVenta);
        }
        const filas = await tx.query<FilaCantidad>(
          `UPDATE productos
           SET cantidad = cantidad + $1,
               precio_compra = COALESCE($2, precio_compra)
           WHERE id = $3
           RETURNING id, cantidad`,
          [datos.cantidad, precioCompra ?? null, existente.id],
        );
        const actualizado = filas.rows[0];
        if (!actualizado) throw new Error('No se pudo actualizar la cantidad del producto.');
        await registrarEvento(tx, {
          tipo: 'ENTRADA_REGISTRADA',
          productoId: actualizado.id,
          usuarioId,
          detalle: {
            cantidadAgregada: datos.cantidad,
            cantidadResultante: actualizado.cantidad,
            referencia: referenciaNormalizada,
            talla: tallaNormalizada,
          },
        });
        return {
          productoId: actualizado.id,
          sumado: true,
          cantidadResultante: actualizado.cantidad,
        };
      }

      if (precioCompra !== undefined) validarPrecioCompra(precioCompra, datos.precioVenta);
      const secuencias = await tx.query<FilaSecuencia>(
        `SELECT nextval('public.codigo_barras_producto_seq')::text AS secuencia`,
      );
      const secuencia = secuencias.rows[0]?.secuencia;
      if (!secuencia) throw new Error('No se pudo reservar la secuencia del código de barras.');
      const codigoBarras = generarCodigoBarras(secuencia);
      const filas = await tx.query<FilaId & { cantidad: number }>(
        `INSERT INTO productos
           (referencia, marca, descripcion, talla, cantidad, precio_venta, precio_compra, fecha_entrada, codigo_barras)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, cantidad`,
        [
          datos.referencia.trim(),
          datos.marca.trim(),
          datos.descripcion.trim(),
          datos.talla.trim(),
          datos.cantidad,
          datos.precioVenta,
          precioCompra ?? null,
          datos.fechaEntrada,
          codigoBarras,
        ],
      );
      const creado = filas.rows[0];
      if (!creado) throw new Error('La base de datos no devolvió el producto recién creado.');
      await registrarEvento(tx, {
        tipo: 'ENTRADA_REGISTRADA',
        productoId: creado.id,
        usuarioId,
        detalle: {
          cantidadAgregada: datos.cantidad,
          cantidadResultante: creado.cantidad,
          referencia: referenciaNormalizada,
          talla: tallaNormalizada,
        },
      });
      return { productoId: creado.id, sumado: false, cantidadResultante: creado.cantidad };
    });
  } catch (error) {
    return traducirErrorProducto(error);
  }
}

export async function listarInventario(
  filtros: {
    referencia?: string;
    codigoBarras?: string;
    marca?: string;
    talla?: string;
    soloDisponibles?: boolean;
  },
  rol: Rol,
): Promise<FilaProducto[]> {
  const { condiciones, valores } = filtrosInventario(filtros);
  valores.push(LIMITE_LISTADO);
  return consultar<FilaProducto>(
    `SELECT ${columnasProducto(rol)}
     FROM v_productos
     WHERE ${condiciones.join(' AND ')}
     ORDER BY clave_referencia ASC, clave_talla ASC
     LIMIT $${valores.length}`,
    valores,
  );
}

export async function exportarInventario(
  filtros: {
    referencia?: string;
    codigoBarras?: string;
    marca?: string;
    talla?: string;
    soloDisponibles?: boolean;
  },
  rol: Rol,
): Promise<FilaProducto[]> {
  const { condiciones, valores } = filtrosInventario(filtros);
  return consultar<FilaProducto>(
    `SELECT ${columnasProducto(rol)}
     FROM v_productos
     WHERE ${condiciones.join(' AND ')}
     ORDER BY clave_referencia ASC, clave_talla ASC`,
    valores,
  );
}

export async function obtenerProducto(
  id: string,
  rol: Rol,
  usuarioId: string,
  filtros: FiltrosKardex = {},
): Promise<DetalleProducto> {
  const productos = await consultar<DetalleProducto>(
    `SELECT ${columnasProducto(rol)}
     FROM v_productos
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  const producto = productos[0];
  if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

  const [eventos, tiposEventos, ventas] = await Promise.all([
    listarEventosProducto(id, rol, usuarioId, filtros),
    listarTiposEventosProducto(id, rol, usuarioId),
    consultar<FilaVenta>(
      `SELECT v.id, v.producto_id AS "productoId", v.usuario_id AS "usuarioId",
              u.nombre AS "nombreUsuario", v.referencia, v.talla, v.cantidad,
              v.precio_venta AS "precioVenta", v.fecha_venta AS "fechaVenta"
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.producto_id = $1
       ORDER BY v.fecha_venta DESC, v.id DESC`,
      [id],
    ),
  ]);

  const detalle = { ...producto, eventos, tiposEventos, ventas };
  if (rol !== 'dueno') return detalle;
  if (producto.precioCompra == null) {
    return { ...detalle, inversion: null, gananciaPotencial: null };
  }
  return {
    ...detalle,
    inversion: inversionProducto(producto.precioCompra, producto.cantidad),
    gananciaPotencial: gananciaPotencialProducto(
      producto.precioVenta,
      producto.precioCompra,
      producto.cantidad,
    ),
  };
}

function condicionesVisibilidadEventos(
  id: string,
  rol: Rol,
  usuarioId: string,
): { condiciones: string[]; valores: Array<string | number> } {
  const valores: Array<string | number> = [id];
  const condiciones = ['producto_id = $1'];
  if (rol !== 'dueno') {
    valores.push(usuarioId);
    condiciones.push(`usuario_id = $${valores.length}`);
  }
  return { condiciones, valores };
}

export async function listarEventosProducto(
  id: string,
  rol: Rol,
  usuarioId: string,
  filtros: FiltrosKardex = {},
): Promise<FilaEvento[]> {
  const { condiciones, valores } = condicionesVisibilidadEventos(id, rol, usuarioId);
  if (filtros.desde) {
    valores.push(filtros.desde);
    condiciones.push(`(created_at AT TIME ZONE 'America/Bogota')::date >= $${valores.length}::date`);
  }
  if (filtros.hasta) {
    valores.push(filtros.hasta);
    condiciones.push(`(created_at AT TIME ZONE 'America/Bogota')::date <= $${valores.length}::date`);
  }
  if (filtros.tipo) {
    valores.push(filtros.tipo);
    condiciones.push(`tipo = $${valores.length}`);
  }
  return consultar<FilaEvento>(
    `SELECT id, tipo, detalle, created_at::text AS "createdAt"
     FROM eventos_inventario
     WHERE ${condiciones.join(' AND ')}
     ORDER BY created_at DESC, id DESC`,
    valores,
  );
}

async function listarTiposEventosProducto(
  id: string,
  rol: Rol,
  usuarioId: string,
): Promise<string[]> {
  const { condiciones, valores } = condicionesVisibilidadEventos(id, rol, usuarioId);
  const filas = await consultar<{ tipo: string }>(
    `SELECT DISTINCT tipo
     FROM eventos_inventario
     WHERE ${condiciones.join(' AND ')}
     ORDER BY tipo`,
    valores,
  );
  return filas.map(({ tipo }) => tipo);
}

export async function actualizarProducto(
  id: string,
  cambios: CambiosProducto,
  usuarioId: string,
  rol: Rol = 'trabajador',
): Promise<void> {
  try {
    await conTransaccion(async (tx) => {
      const actuales = await tx.query<{
        id: string;
        precioVenta: number;
        precioCompra: number | null;
      }>(
        `SELECT id, precio_venta AS "precioVenta", precio_compra AS "precioCompra"
         FROM productos
         WHERE id = $1 AND activo = true
         FOR UPDATE`,
        [id],
      );
      const actual = actuales.rows[0];
      if (!actual) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

      const precioVenta = cambios.precioVenta ?? actual.precioVenta;
      const precioCompra =
        rol === 'dueno' ? (cambios.precioCompra ?? actual.precioCompra) : actual.precioCompra;
      if (precioCompra !== null) validarPrecioCompra(precioCompra, precioVenta);

      const asignaciones: string[] = [];
      const valores: Array<string | number> = [];
      if (cambios.marca !== undefined) {
        valores.push(cambios.marca.trim());
        asignaciones.push(`marca = $${valores.length}`);
      }
      if (cambios.descripcion !== undefined) {
        valores.push(cambios.descripcion.trim());
        asignaciones.push(`descripcion = $${valores.length}`);
      }
      if (cambios.precioVenta !== undefined) {
        valores.push(cambios.precioVenta);
        asignaciones.push(`precio_venta = $${valores.length}`);
      }
      if (rol === 'dueno' && cambios.precioCompra !== undefined) {
        valores.push(cambios.precioCompra);
        asignaciones.push(`precio_compra = $${valores.length}`);
      }
      if (rol === 'dueno' && cambios.stockMinimo !== undefined) {
        valores.push(cambios.stockMinimo);
        asignaciones.push(`stock_minimo = $${valores.length}`);
      }
      if (asignaciones.length === 0) throw new ErrorDeNegocio('DATOS_INVALIDOS');

      valores.push(id);
      const actualizado = await tx.query<FilaId>(
        `UPDATE productos SET ${asignaciones.join(', ')}
         WHERE id = $${valores.length} AND activo = true
         RETURNING id`,
        valores,
      );
      if (!actualizado.rows[0]) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
      const detalle = {
        ...(cambios.marca !== undefined ? { marca: cambios.marca } : {}),
        ...(cambios.descripcion !== undefined ? { descripcion: cambios.descripcion } : {}),
        ...(cambios.precioVenta !== undefined ? { precioVenta: cambios.precioVenta } : {}),
        ...(rol === 'dueno' && cambios.stockMinimo !== undefined
          ? { stockMinimo: cambios.stockMinimo }
          : {}),
      };
      await registrarEvento(tx, {
        tipo: 'PRODUCTO_ACTUALIZADO',
        productoId: actual.id,
        usuarioId,
        detalle,
      });
    });
  } catch (error) {
    traducirErrorProducto(error);
  }
}

export async function desactivarProducto(id: string, usuarioId: string): Promise<void> {
  await conTransaccion(async (tx) => {
    const resultado = await tx.query<FilaCantidad>(
      `SELECT id, cantidad, referencia
       FROM productos
       WHERE id = $1 AND activo = true
       FOR UPDATE`,
      [id],
    );
    const producto = resultado.rows[0];
    if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
    if (producto.cantidad > 0) throw new ErrorDeNegocio('PRODUCTO_CON_EXISTENCIAS');

    await tx.query(`UPDATE productos SET activo = false WHERE id = $1`, [id]);
    await registrarEvento(tx, {
      tipo: 'PRODUCTO_DESACTIVADO',
      productoId: id,
      usuarioId,
      detalle: { referencia: producto.referencia },
    });
  });
}
