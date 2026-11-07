import Link from 'next/link';
import type { FilaProducto } from '@/lib/datos/tipos';
import type { Rol } from '@/lib/reglas/roles';
import { formatearCantidad, formatearPesos } from '@/lib/formato';
import { InsigniaDisponibilidad } from '@/components/panel/InsigniaDisponibilidad';
import styles from './panel.module.css';

export function TablaInventario({ productos, rol }: { productos: FilaProducto[]; rol: Rol }) {
  return (
    <div className={styles.tablaDesbordable}>
      <table className={styles.tablaPanel}>
        <thead>
          <tr>
            <th scope="col">Referencia</th>
            <th scope="col">Marca</th>
            <th scope="col">Descripción</th>
            <th scope="col">Talla</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Precio de venta</th>
            {rol === 'dueno' && <th scope="col">Precio compra</th>}
            <th scope="col">Disponibilidad</th>
            <th scope="col"><span className={styles.soloLectores}>Acción</span></th>
            <th scope="col">Etiquetas</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((producto) => {
            const porReponer = producto.stockMinimo != null && producto.cantidad <= producto.stockMinimo;
            return (
            <tr className={porReponer ? styles.filaPorReponer : undefined} key={producto.id}>
              <th scope="row">{producto.referencia}</th>
              <td>{producto.marca}</td>
              <td>{producto.descripcion}</td>
              <td>{producto.talla}</td>
              <td className={styles.numeroTabular}>
                {formatearCantidad(producto.cantidad)}
                {porReponer && <span className={styles.etiquetaPorReponer}>Por reponer</span>}
              </td>
              <td>{formatearPesos(producto.precioVenta)}</td>
              {rol === 'dueno' && (
                <td>
                  {producto.precioCompra === null || producto.precioCompra === undefined
                    ? '—'
                    : formatearPesos(producto.precioCompra)}
                </td>
              )}
              <td>
                <InsigniaDisponibilidad
                  activo={producto.activo}
                  disponible={producto.disponible}
                />
              </td>
              <td>
                <Link
                  className={styles.enlaceTexto}
                  href={`/panel/inventario/${producto.id}`}
                  aria-label={`Ver detalle de ${producto.referencia}`}
                >
                  Ver
                </Link>
              </td>
              <td>
                <Link
                  className={styles.enlaceTexto}
                  href={`/panel/etiquetas?id=${producto.id}`}
                  aria-label={`Imprimir etiqueta de ${producto.referencia}`}
                >
                  Imprimir
                </Link>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <div className={styles.tarjetasInventario}>
        {productos.map((producto) => {
          const porReponer = producto.stockMinimo != null && producto.cantidad <= producto.stockMinimo;
          return (
          <article
            className={`${styles.tarjetaInventario} ${porReponer ? styles.tarjetaPorReponer : ''}`}
            key={producto.id}
          >
            <header>
              <strong>{producto.referencia}</strong>
              <InsigniaDisponibilidad
                activo={producto.activo}
                disponible={producto.disponible}
              />
            </header>
            <p>{producto.marca} · {producto.descripcion}</p>
            <dl>
              <div><dt>Talla</dt><dd>{producto.talla}</dd></div>
              <div>
                <dt>Cantidad</dt>
                <dd className={styles.numeroTabular}>
                  {formatearCantidad(producto.cantidad)}
                  {porReponer && <span className={styles.etiquetaPorReponer}>Por reponer</span>}
                </dd>
              </div>
              <div><dt>Precio de venta</dt><dd>{formatearPesos(producto.precioVenta)}</dd></div>
              {rol === 'dueno' && (
                <div>
                  <dt>Precio compra</dt>
                  <dd>
                    {producto.precioCompra === null || producto.precioCompra === undefined
                      ? '—'
                      : formatearPesos(producto.precioCompra)}
                  </dd>
                </div>
              )}
            </dl>
            <Link
              className={styles.enlaceTexto}
              href={`/panel/inventario/${producto.id}`}
              aria-label={`Ver detalle de ${producto.referencia}`}
            >
              Ver detalle
            </Link>
            <Link
              className={styles.enlaceTexto}
              href={`/panel/etiquetas?id=${producto.id}`}
              aria-label={`Imprimir etiqueta de ${producto.referencia}`}
            >
              Imprimir etiqueta
            </Link>
          </article>
          );
        })}
      </div>
    </div>
  );
}
