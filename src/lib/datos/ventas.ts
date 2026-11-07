import { conTransaccion, consultar } from '@/lib/db/conexion';
import { LIMITE_LISTADO } from '@/lib/config/stockly';
import { registrarEvento } from '@/lib/datos/eventos';
import type { DatosVenta, FilaVenta, ResultadoVenta } from '@/lib/datos/tipos';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { normalizarReferencia, normalizarTalla } from '@/lib/reglas/producto';
import { cantidadTrasVenta, validarVenta } from '@/lib/reglas/venta';

type FilaProductoBloqueado = {
  id: string;
  referencia: string;
  talla: string;
  cantidad: number;
  precioVenta: number;
};

export async function registrarVenta(
  datos: DatosVenta,
  usuarioId: string,
): Promise<ResultadoVenta> {
  validarVenta(datos);

  return conTransaccion(async (tx) => {
    const filasProducto = await tx.query<FilaProductoBloqueado>(
      `SELECT id, referencia, talla, cantidad,
              precio_venta AS "precioVenta"
       FROM productos
       WHERE clave_referencia = $1 AND clave_talla = $2 AND activo = true
       FOR UPDATE`,
      [normalizarReferencia(datos.referencia), normalizarTalla(datos.talla)],
    );
    const producto = filasProducto.rows[0];
    if (!producto) throw new ErrorDeNegocio('PRODUCTO_NO_ENCONTRADO');

    const cantidadResultante = cantidadTrasVenta(producto.cantidad, datos.cantidad);
    const ventas = await tx.query<FilaVenta>(
      `INSERT INTO ventas
         (producto_id, usuario_id, referencia, talla, cantidad, precio_venta, fecha_venta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, producto_id AS "productoId", usuario_id AS "usuarioId",
                 referencia, talla, cantidad, precio_venta AS "precioVenta",
                 fecha_venta AS "fechaVenta"`,
      [
        producto.id,
        usuarioId,
        producto.referencia,
        producto.talla,
        datos.cantidad,
        producto.precioVenta,
        hoyBogota(),
      ],
    );
    const venta = ventas.rows[0];
    if (!venta) throw new Error('La base de datos no devolvió la venta recién registrada.');

    await tx.query(`UPDATE productos SET cantidad = $1 WHERE id = $2`, [
      cantidadResultante,
      producto.id,
    ]);
    await registrarEvento(tx, {
      tipo: 'VENTA_REGISTRADA',
      productoId: producto.id,
      usuarioId,
      detalle: {
        ventaId: venta.id,
        cantidad: datos.cantidad,
        cantidadResultante,
      },
    });

    return {
      venta: { ...venta, nombreUsuario: null },
      cantidadResultante,
      agotado: cantidadResultante === 0,
    };
  });
}

async function consultarVentas(
  filtros: {
    referencia?: string;
    desde?: string;
    hasta?: string;
  },
  limitar: boolean,
): Promise<FilaVenta[]> {
  const condiciones: string[] = [];
  const valores: Array<string | number> = [];

  if (filtros.referencia?.trim()) {
    valores.push(`%${normalizarReferencia(filtros.referencia)}%`);
    condiciones.push(`upper(btrim(v.referencia)) LIKE $${valores.length}`);
  }
  if (filtros.desde) {
    valores.push(filtros.desde);
    condiciones.push(`v.fecha_venta >= $${valores.length}`);
  }
  if (filtros.hasta) {
    valores.push(filtros.hasta);
    condiciones.push(`v.fecha_venta <= $${valores.length}`);
  }
  if (limitar) valores.push(LIMITE_LISTADO);

  return consultar<FilaVenta>(
    `SELECT v.id, v.producto_id AS "productoId", v.usuario_id AS "usuarioId",
            u.nombre AS "nombreUsuario", v.referencia, v.talla, v.cantidad,
            v.precio_venta AS "precioVenta", v.fecha_venta AS "fechaVenta"
     FROM ventas v
     LEFT JOIN usuarios u ON u.id = v.usuario_id
     ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
     ORDER BY v.fecha_venta DESC, v.id DESC
     ${limitar ? `LIMIT $${valores.length}` : ''}`,
    valores,
  );
}

export async function listarVentas(filtros: {
  referencia?: string;
  desde?: string;
  hasta?: string;
}): Promise<FilaVenta[]> {
  return consultarVentas(filtros, true);
}

export async function exportarVentas(filtros: {
  referencia?: string;
  desde?: string;
  hasta?: string;
}): Promise<FilaVenta[]> {
  return consultarVentas(filtros, false);
}
