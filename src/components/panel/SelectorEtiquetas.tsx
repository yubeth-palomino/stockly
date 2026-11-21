'use client';

import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { FilaProducto } from '@/lib/datos/tipos';
import { formatearPesos } from '@/lib/formato';
import { validarCodigoBarras } from '@/lib/reglas/codigoBarras';
import { CodigoBarrasEAN13 } from '@/components/panel/CodigoBarrasEAN13';
import styles from './etiquetas.module.css';

export function SelectorEtiquetas({
  productos,
  productoInicial,
}: {
  productos: FilaProducto[];
  productoInicial?: string;
}) {
  const [seleccionados, setSeleccionados] = useState<Record<string, number>>(
    productoInicial ? { [productoInicial]: 1 } : {},
  );
  const [formato, setFormato] = useState<'etiqueta' | 'a4'>('etiqueta');
  const etiquetas = useMemo(
    () => productos.flatMap((producto) =>
      Array.from({ length: Math.min(seleccionados[producto.id] ?? 0, 100) }, (_, indice) => ({
        producto,
        clave: `${producto.id}-${indice}`,
      })),
    ),
    [productos, seleccionados],
  );

  function imprimirEtiquetas() {
    window.requestAnimationFrame(() => window.print());
  }

  return (
    <>
      <section className={`${styles.selector} ${styles.ocultoImpresion}`}>
        <h2>Selecciona productos y cantidad</h2>
        {productos.map((producto) => (
          <label className={styles.filaSeleccion} key={producto.id}>
            <input
              checked={Boolean(seleccionados[producto.id])}
              onChange={(evento) => setSeleccionados((actual) => {
                const siguiente = { ...actual };
                if (evento.target.checked) siguiente[producto.id] = 1;
                else delete siguiente[producto.id];
                return siguiente;
              })}
              type="checkbox"
            />
            <span>{producto.referencia} · Talla {producto.talla} · {producto.marca}</span>
            <input
              aria-label={`Cantidad de etiquetas para ${producto.referencia} talla ${producto.talla}`}
              disabled={!seleccionados[producto.id]}
              max="100"
              min="1"
              onChange={(evento) => setSeleccionados((actual) => ({
                ...actual,
                [producto.id]: Number(evento.target.value),
              }))}
              type="number"
              value={seleccionados[producto.id] ?? 1}
            />
          </label>
        ))}
        <label className={styles.formato}>
          Formato de impresión
          <select
            onChange={(evento) => setFormato(evento.target.value === 'etiqueta' ? 'etiqueta' : 'a4')}
            value={formato}
          >
            <option value="a4">Hoja A4, varias columnas</option>
            <option value="etiqueta">Etiqueta individual 50 × 30 mm</option>
          </select>
        </label>
        <button
          className={styles.botonImprimir}
          disabled={etiquetas.length === 0}
          onClick={imprimirEtiquetas}
          type="button"
        >
          Imprimir etiquetas
        </button>
        {productos.some(({ codigoBarras }) => !codigoBarras) && (
          <p role="note">Si el producto no tiene código de barras, el QR usará su referencia.</p>
        )}
      </section>
      {etiquetas.length === 0 ? (
        <p className={styles.ocultoImpresion}>Selecciona al menos un producto para imprimir.</p>
      ) : (
        <section
          aria-label="Vista previa de etiquetas"
          className={`${styles.etiquetas} ${styles.areaImpresion} ${formato === 'a4' ? styles.laminaA4 : styles.etiquetaIndividual}`}
          data-print-area="etiquetas"
          id="print-area"
        >
          {etiquetas.map(({ producto, clave }) => (
            <article className={styles.etiqueta} key={clave}>
              <div className={styles.datosEtiqueta}>
                <strong>{producto.descripcion || producto.referencia}</strong>
                <span>{producto.marca} · {producto.referencia} · Talla {producto.talla}</span>
                <b>{formatearPesos(producto.precioVenta)}</b>
              </div>
              <QRCodeSVG
                aria-label={`Código QR de ${producto.referencia}`}
                className={styles.codigoQr}
                level="M"
                marginSize={2}
                size={96}
                title={`Código QR de ${producto.referencia}`}
                value={producto.codigoBarras ?? producto.referencia}
              />
              <div className={styles.codigoEtiqueta}>
                {producto.codigoBarras && validarCodigoBarras(producto.codigoBarras) && (
                  <CodigoBarrasEAN13 codigo={producto.codigoBarras} />
                )}
                <small>{producto.codigoBarras ?? producto.referencia}</small>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
