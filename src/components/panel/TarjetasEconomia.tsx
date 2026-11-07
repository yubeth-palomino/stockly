import type { ResumenEconomico } from '@/lib/datos/tipos';
import { formatearCantidad, formatearPesos } from '@/lib/formato';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import styles from './panel.module.css';

export function TarjetasEconomia({ economia }: { economia: ResumenEconomico }) {
  const tarjetas = [
    { etiqueta: 'Inversión total', valor: formatearPesos(economia.inversionTotal) },
    { etiqueta: 'Ganancia potencial total', valor: formatearPesos(economia.gananciaPotencialTotal) },
    {
      etiqueta: 'Ganancia realizada total',
      valor:
        economia.gananciaRealizadaTotal === null
          ? 'No disponible'
          : formatearPesos(economia.gananciaRealizadaTotal),
    },
  ];

  return (
    <>
      <section className={styles.metricas} aria-label="Totales económicos">
        {tarjetas.map((tarjeta) => (
          <article className={styles.metrica} key={tarjeta.etiqueta}>
            <span className={styles.metricaEtiqueta}>{tarjeta.etiqueta}</span>
            <strong className={styles.metricaValor}>{tarjeta.valor}</strong>
          </article>
        ))}
      </section>
      {economia.gananciaRealizadaTotal === null && (
        <p role="note">
          No se muestra la ganancia realizada: esta vista no tiene una empresa autorizada
          seleccionada y las ventas legadas no guardan el costo histórico por operación.
        </p>
      )}
      <section className={styles.seccionResumen}>
        <h2>Detalle económico por producto</h2>
        {economia.productos.length === 0 ? (
          <EstadoVacio titulo="No hay productos activos para mostrar" />
        ) : (
          <div className={styles.tablaDesbordable}>
            <table className={styles.tablaPanel}>
              <thead>
                <tr>
                  <th scope="col">Referencia</th>
                  <th scope="col">Marca</th>
                  <th scope="col">Talla</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Precio de compra</th>
                  <th scope="col">Ganancia por unidad</th>
                  <th scope="col">Inversión</th>
                  <th scope="col">Ganancia potencial</th>
                </tr>
              </thead>
              <tbody>
                {economia.productos.map((producto) => (
                  <tr key={producto.id}>
                    <th scope="row">{producto.referencia}</th>
                    <td>{producto.marca}</td>
                    <td>{producto.talla}</td>
                    <td>{formatearCantidad(producto.cantidad)}</td>
                    <td>
                      {producto.sinPrecioCompra
                        ? 'Sin precio de compra'
                        : formatearPesos(producto.precioCompra ?? 0)}
                    </td>
                    <td>
                      {producto.gananciaPorUnidad === null
                        ? '—'
                        : formatearPesos(producto.gananciaPorUnidad)}
                    </td>
                    <td>{producto.inversion === null ? '—' : formatearPesos(producto.inversion)}</td>
                    <td>
                      {producto.gananciaPotencial === null
                        ? '—'
                        : formatearPesos(producto.gananciaPotencial)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.tarjetasInventario}>
              {economia.productos.map((producto) => (
                <article className={styles.tarjetaInventario} key={producto.id}>
                  <header><strong>{producto.referencia}</strong><span>{producto.marca} · {producto.talla}</span></header>
                  <p>{formatearCantidad(producto.cantidad)} unidades</p>
                  <dl>
                    <div>
                      <dt>Precio de compra</dt>
                      <dd>{producto.sinPrecioCompra ? 'Sin precio de compra' : formatearPesos(producto.precioCompra ?? 0)}</dd>
                    </div>
                    <div>
                      <dt>Ganancia por unidad</dt>
                      <dd>{producto.gananciaPorUnidad === null ? '—' : formatearPesos(producto.gananciaPorUnidad)}</dd>
                    </div>
                    <div>
                      <dt>Inversión</dt>
                      <dd>{producto.inversion === null ? '—' : formatearPesos(producto.inversion)}</dd>
                    </div>
                    <div>
                      <dt>Ganancia potencial</dt>
                      <dd>{producto.gananciaPotencial === null ? '—' : formatearPesos(producto.gananciaPotencial)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
