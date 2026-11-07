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
import { esquemaFiltrosKardex } from '@/lib/validacion/esquemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string | string[]; hasta?: string | string[]; tipo?: string | string[] }>;
};

export default async function DetalleProductoPage({ params, searchParams }: Props) {
  const usuario = await obtenerUsuario();
  if (!usuario) throw new Error('No se encontró el usuario Stockly autenticado.');
  const { id } = await params;
  const productoId = z.string().uuid().safeParse(id);
  if (!productoId.success) notFound();
  const parametros = await searchParams;
  const filtrosSinValidar: Record<string, unknown> = {};
  if (parametros.desde !== undefined) filtrosSinValidar.desde = parametros.desde;
  if (parametros.hasta !== undefined) filtrosSinValidar.hasta = parametros.hasta;
  if (parametros.tipo !== undefined) filtrosSinValidar.tipo = parametros.tipo;
  const filtros = esquemaFiltrosKardex.parse(filtrosSinValidar);
  const exportParams = new URLSearchParams();
  if (filtros.desde) exportParams.set('desde', filtros.desde);
  if (filtros.hasta) exportParams.set('hasta', filtros.hasta);
  if (filtros.tipo) exportParams.set('tipo', filtros.tipo);
  const exportQuery = exportParams.toString();

  let producto;
  try {
    producto = await obtenerProducto(productoId.data, usuario.rol, usuario.id, filtros);
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
            {usuario.rol === 'dueno' && (
              <div>
                <dt>Stock mínimo</dt>
                <dd>{producto.stockMinimo ?? 'Sin configurar'}</dd>
              </div>
            )}
            <div><dt>Fecha de entrada</dt><dd>{formatearFecha(producto.fechaEntrada)}</dd></div>
            <div>
              <dt>Código de barras</dt>
              <dd>{producto.codigoBarras ?? 'Pendiente de código'}</dd>
            </div>
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
            stockMinimoInicial={producto.stockMinimo ?? null}
          />
          <Link className={styles.enlaceTexto} href={`/panel/etiquetas?id=${producto.id}`}>
            Imprimir etiquetas
          </Link>
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
        <form className={styles.filtrosKardex} method="get">
          <label>
            Desde
            <input defaultValue={filtros.desde} name="desde" type="date" />
          </label>
          <label>
            Hasta
            <input defaultValue={filtros.hasta} name="hasta" type="date" />
          </label>
          <label>
            Tipo de movimiento
            <select defaultValue={filtros.tipo ?? ''} name="tipo">
              <option value="">Todos</option>
              {producto.tiposEventos.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrar</button>
          <Link
            className={styles.enlaceTexto}
            href={`/api/panel/productos/${producto.id}/kardex${exportQuery ? `?${exportQuery}` : ''}`}
          >
            Exportar Kardex CSV
          </Link>
        </form>
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
