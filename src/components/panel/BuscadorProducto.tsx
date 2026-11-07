'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Campo } from '@/components/ui/Campo';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { normalizarReferencia, normalizarTalla } from '@/lib/reglas/producto';
import styles from './panel.module.css';

const esquemaProductos = z.array(
  z.object({
    id: z.string().uuid(),
    referencia: z.string(),
    talla: z.string(),
    cantidad: z.number().int(),
    precioVenta: z.number().int(),
  }),
);

export type ProductoSeleccionado = z.infer<typeof esquemaProductos>[number];

export function BuscadorProducto({
  producto,
  alSeleccionar,
  reintentos,
}: {
  producto: ProductoSeleccionado | null;
  alSeleccionar: (producto: ProductoSeleccionado | null) => void;
  reintentos: number;
}) {
  const [referencia, setReferencia] = useState('');
  const [talla, setTalla] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!referencia.trim() || !talla.trim()) return;

    const controlador = new AbortController();
    const temporizador = window.setTimeout(async () => {
      setBuscando(true);
      setError('');
      setBusquedaRealizada(false);
      const parametros = new URLSearchParams({ referencia, talla });
      try {
        const response = await fetch(`/api/panel/productos?${parametros}`, {
          signal: controlador.signal,
        });
        const productos = await leerRespuestaApi(response, esquemaProductos);
        const encontrado =
          productos.find(
            (item) =>
              normalizarReferencia(item.referencia) === normalizarReferencia(referencia) &&
              normalizarTalla(item.talla) === normalizarTalla(talla),
          ) ?? null;
        alSeleccionar(encontrado);
        setBusquedaRealizada(true);
      } catch (errorCapturado) {
        if (errorCapturado instanceof DOMException && errorCapturado.name === 'AbortError') return;
        alSeleccionar(null);
        setError(
          errorCapturado instanceof Error
            ? errorCapturado.message
            : 'No se pudo consultar el inventario.',
        );
      } finally {
        if (!controlador.signal.aborted) setBuscando(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [referencia, talla, reintentos, alSeleccionar]);

  return (
    <div className={styles.formularioPanel}>
      <Campo
        etiqueta="Referencia"
        value={referencia}
        onChange={(evento) => {
          setReferencia(evento.target.value);
          alSeleccionar(null);
          setBusquedaRealizada(false);
        }}
        autoComplete="off"
      />
      <Campo
        etiqueta="Talla"
        value={talla}
        onChange={(evento) => {
          setTalla(evento.target.value);
          alSeleccionar(null);
          setBusquedaRealizada(false);
        }}
        autoComplete="off"
      />
      {buscando && <p className={styles.textoSuave} role="status">Buscando producto…</p>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      {!buscando && !error && busquedaRealizada && !producto && (
        <Aviso tipo="advertencia">No existe un producto con esa referencia y talla.</Aviso>
      )}
      {!buscando && producto && (
        <Aviso tipo={producto.cantidad > 0 ? 'info' : 'advertencia'} titulo={producto.referencia}>
          Talla {producto.talla} · {producto.cantidad} unidades disponibles ·{' '}
          {producto.cantidad > 0 ? 'Disponible' : 'Agotado'}
        </Aviso>
      )}
    </div>
  );
}
