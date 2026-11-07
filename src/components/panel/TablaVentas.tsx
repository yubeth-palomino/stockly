import type { FilaVenta } from '@/lib/datos/tipos';
import { formatearCantidad, formatearFecha, formatearPesos } from '@/lib/formato';
import styles from './panel.module.css';

export function TablaVentas({ ventas }: { ventas: FilaVenta[] }) {
  return (
    <div className={styles.tablaDesbordable}>
      <table className={styles.tablaPanel}>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Referencia</th>
            <th scope="col">Talla</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Precio de venta</th>
            <th scope="col">Total</th>
            <th scope="col">Registró</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((venta) => (
            <tr key={venta.id}>
              <td>{formatearFecha(venta.fechaVenta)}</td>
              <th scope="row">{venta.referencia}</th>
              <td>{venta.talla}</td>
              <td className={styles.numeroTabular}>{formatearCantidad(venta.cantidad)}</td>
              <td>{formatearPesos(venta.precioVenta)}</td>
              <td>{formatearPesos(venta.precioVenta * venta.cantidad)}</td>
              <td>{venta.nombreUsuario ?? 'Usuario no disponible'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.tarjetasInventario}>
        {ventas.map((venta) => (
          <article className={styles.tarjetaInventario} key={venta.id}>
            <header><strong>{venta.referencia}</strong><time>{formatearFecha(venta.fechaVenta)}</time></header>
            <p>Talla {venta.talla} · {formatearCantidad(venta.cantidad)} unidades</p>
            <dl>
              <div><dt>Precio unitario</dt><dd>{formatearPesos(venta.precioVenta)}</dd></div>
              <div><dt>Total</dt><dd>{formatearPesos(venta.precioVenta * venta.cantidad)}</dd></div>
              <div><dt>Registró</dt><dd>{venta.nombreUsuario ?? 'Usuario no disponible'}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
