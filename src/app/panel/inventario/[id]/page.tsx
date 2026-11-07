import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccionesProducto } from '@/components/panel/AccionesProducto';
import { InsigniaDisponibilidad } from '@/components/panel/InsigniaDisponibilidad';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Tarjeta } from '@/components/ui/Tarjeta';
import styles from '@/components/panel/panel.module.css';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { obtenerProducto } from '@/lib/dataService';
import { formatearCantidad, formatearFecha, formatearPesos } from '@/lib/formato';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { totalLineaVenta } from '@/lib/reglas/venta';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function DetalleProductoPage({ params }: Props) {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No se encontró el usuario Stockly autenticado.');
  const { id } = await params;
  const productoId = z.string().uuid().safeParse(id);
  if (!productoId.success) notFound();

  let producto;
  try {
    producto = await obtenerProducto(productoId.data, usuario.rol);
  } catch (error) {
    if (error instanceof ErrorDeNegocio && error.codigo === 'PRODUCTO_NO_ENCONTRADO') notFound();
    throw error;
  }

  return (
    <>
      <header className={styles.encabezadoPagina}>
        <div>
          <p className={styles.sobretitulo}>Inventario · Detalle</p>
          <h1 className={styles.titulo}>{producto.referencia}</h1>
          <p className={styles.descripcion}>{producto.marca} · Talla {producto.talla}</p>
        </div>
        <InsigniaDisponibilidad activo={producto.activo} disponible={producto.disponible} />
      </header>

      <div className={styles.detalleProducto}>
        <Tarjeta>
          <h2>Información del producto</h2>
          <dl className={styles.detalleLista}>
            <div><dt>Descripción</dt><dd>{producto.descripcion}</dd></div>
            <div><dt>Referencia</dt><dd>{producto.referencia}</dd></div>
            <div><dt>Marca</dt><dd>{producto.marca}</dd></div>
            <div><dt>Talla</dt><dd>{producto.talla}</dd></div>
            <div><dt>Cantidad</dt><dd>{formatearCantidad(producto.cantidad)}</dd></div>
            <div><dt>Precio de venta</dt><dd>{formatearPesos(producto.precioVenta)}</dd></div>
            <div><dt>Fecha de entrada</dt><dd>{formatearFecha(producto.fechaEntrada)}</dd></div>
            {usuario.rol === 'dueno' && (
              <div>
                <dt>Precio compra</dt>
                <dd>
                  {producto.precioCompra == null
                    ? 'Sin precio de compra registrado'
                    : formatearPesos(producto.precioCompra)}
                </dd>
              </div>
            )}
            {usuario.rol === 'dueno' && producto.precioCompra != null && (
              <>
                <div>
                  <dt>Inversión disponible</dt>
                  <dd>{formatearPesos(producto.inversion ?? 0)}</dd>
                </div>
                <div>
                  <dt>Ganancia potencial</dt>
                  <dd>{formatearPesos(producto.gananciaPotencial ?? 0)}</dd>
                </div>
              </>
            )}
          </dl>
          <AccionesProducto
            id={producto.id}
            rol={usuario.rol}
            cantidad={producto.cantidad}
            marcaInicial={producto.marca}
            descripcionInicial={producto.descripcion}
            precioVentaInicial={producto.precioVenta}
            precioCompraInicial={producto.precioCompra ?? null}
          />
        </Tarjeta>
      </div>

      <section className={styles.seccionResumen}>
        <h2>Historial de ventas</h2>
        {producto.ventas.length === 0 ? (
          <EstadoVacio titulo="Este producto todavía no tiene ventas" />
        ) : (
          <div className={styles.tablaDesbordable}>
            <table className={styles.tablaPanel}>
              <thead><tr><th>Fecha</th><th>Cantidad</th><th>Precio unitario</th><th>Total</th></tr></thead>
              <tbody>
                {producto.ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>{formatearFecha(venta.fechaVenta)}</td>
                    <td>{formatearCantidad(venta.cantidad)}</td>
                    <td>{formatearPesos(venta.precioVenta)}</td>
                    <td>{formatearPesos(totalLineaVenta(venta.precioVenta, venta.cantidad))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.seccionResumen}>
        <h2>Historial de movimientos</h2>
        {producto.eventos.length === 0 ? (
          <EstadoVacio titulo="Este producto todavía no tiene movimientos" />
        ) : (
          <ol className={styles.listaEventos}>
            {producto.eventos.map((evento) => (
              <li key={evento.id}>
                <strong>{evento.tipo.replaceAll('_', ' ')}</strong>
                <time dateTime={evento.createdAt}>{evento.createdAt.slice(0, 10)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Link className={styles.enlaceTexto} href="/panel/inventario">Volver al inventario</Link>
    </>
  );
}
