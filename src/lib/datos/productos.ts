import { conTransaccion, consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { normalizarReferencia, normalizarTalla, validarEntrada } from '@/lib/reglas/producto';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { registrarEvento } from '@/lib/datos/eventos';
import type {
  CambiosProducto,
  DatosEntrada,
  DetalleProducto,
  FilaEvento,
  FilaProducto,
  FilaVenta,
} from '@/lib/datos/tipos';
import type { Rol } from '@/lib/reglas/roles';

type FilaId = { id: string };
type FilaCantidad = { id: string; cantidad: number; referencia?: string };
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
  ];
  if (rol === 'dueno') columnas.push('precio_compra AS "precioCompra"');
  return columnas.join(', ');
}

function filtrosInventario(filtros: {
  referencia?: string;
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
): Promise<{ productoId: string; sumado: boolean; cantidadResultante: number }> {
  validarEntrada({ ...datos, hoy: hoyBogota() });

  try {
    return await conTransaccion(async (tx) => {
      const referenciaNormalizada = normalizarReferencia(datos.referencia);
      const tallaNormalizada = normalizarTalla(datos.talla);
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`, [
        referenciaNormalizada,
        tallaNormalizada,
      ]);

      const existentes = await tx.query<FilaCantidad>(
        `SELECT id, cantidad FROM productos
         WHERE clave_referencia = $1 AND clave_talla = $2 AND activo = true
         FOR UPDATE`,
        [referenciaNormalizada, tallaNormalizada],
      );
      const existente = existentes.rows[0];

      if (existente) {
        const filas = await tx.query<FilaCantidad>(
          `UPDATE productos
           SET cantidad = cantidad + $1
           WHERE id = $2
           RETURNING id, cantidad`,
          [datos.cantidad, existente.id],
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

      const filas = await tx.query<FilaId & { cantidad: number }>(
        `INSERT INTO productos
           (referencia, marca, descripcion, talla, cantidad, precio_venta, fecha_entrada)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, cantidad`,
        [
          datos.referencia.trim(),
          datos.marca.trim(),
          datos.descripcion.trim(),
          datos.talla.trim(),
          datos.cantidad,
          datos.precioVenta,
          datos.fechaEntrada,
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

export async function obtenerProducto(id: string, rol: Rol): Promise<DetalleProducto> {
  const productos = await consultar<DetalleProducto>(
    `SELECT ${columnasProducto(rol)}
     FROM v_productos
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  const producto = productos[0];
  if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

  const [eventos, ventas] = await Promise.all([
    consultar<FilaEvento>(
      `SELECT id, tipo, detalle, created_at::text AS "createdAt"
       FROM eventos_inventario
       WHERE producto_id = $1
       ORDER BY created_at DESC, id DESC`,
      [id],
    ),
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

  return { ...producto, eventos, ventas };
}

export async function actualizarProducto(
  id: string,
  cambios: CambiosProducto,
  usuarioId: string,
): Promise<void> {
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
  if (asignaciones.length === 0) throw new ErrorDeNegocio('DATOS_INVALIDOS');

  try {
    await conTransaccion(async (tx) => {
      valores.push(id);
      const resultado = await tx.query<FilaId>(
        `UPDATE productos
         SET ${asignaciones.join(', ')}
         WHERE id = $${valores.length} AND activo = true
         RETURNING id`,
        valores,
      );
      const producto = resultado.rows[0];
      if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');
      await registrarEvento(tx, {
        tipo: 'PRODUCTO_ACTUALIZADO',
        productoId: producto.id,
        usuarioId,
        detalle: cambios,
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
