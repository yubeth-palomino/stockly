'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Campo } from '@/components/ui/Campo';
import { EscanerCamara } from '@/components/panel/EscanerCamara';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { validarCodigoBarras } from '@/lib/reglas/codigoBarras';
import { normalizarReferencia, normalizarTalla } from '@/lib/reglas/producto';
import styles from './panel.module.css';

const esquemaProductos = z.array(
  z.object({
    id: z.string().uuid(),
    referencia: z.string(),
    talla: z.string(),
    cantidad: z.number().int(),
    precioVenta: z.number().int(),
    codigoBarras: z.string().nullable().optional(),
  }),
);

export type ProductoSeleccionado = z.infer<typeof esquemaProductos>[number];

export function BuscadorProducto({
  producto,
  alSeleccionar,
  reintentos,
  alEscanear,
}: {
  producto: ProductoSeleccionado | null;
  alSeleccionar: (producto: ProductoSeleccionado | null) => void;
  reintentos: number;
  alEscanear?: (producto: ProductoSeleccionado | null) => void;
}) {
  const [referencia, setReferencia] = useState('');
  const [talla, setTalla] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const codigoListo = codigoBarras.length === 13 && validarCodigoBarras(codigoBarras);
    if (codigoBarras.length > 0 && !codigoListo) return;
    if (!codigoListo && (!referencia.trim() || !talla.trim())) return;

    const controlador = new AbortController();
    const temporizador = window.setTimeout(async () => {
      setBuscando(true);
      setError('');
      setBusquedaRealizada(false);
      const parametros = codigoListo
        ? new URLSearchParams({ codigoBarras })
        : new URLSearchParams({ referencia, talla });
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
        if (codigoListo) alEscanear?.(encontrado);
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
  }, [referencia, talla, codigoBarras, reintentos, alSeleccionar, alEscanear]);

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
      <Campo
        etiqueta="Escanear código de barras"
        value={codigoBarras}
        onChange={(evento) => {
          const codigo = evento.target.value.replace(/\D/g, '').slice(0, 13);
          setCodigoBarras(codigo);
          setReferencia('');
          setTalla('');
          alSeleccionar(null);
          setBusquedaRealizada(false);
          setError(
            codigo.length === 13 && !validarCodigoBarras(codigo)
              ? 'El código EAN-13 escaneado no es válido.'
              : '',
          );
        }}
        autoComplete="off"
        inputMode="numeric"
        autoFocus
      />
      <EscanerCamara
        alLeer={(codigo) => {
          setCodigoBarras(codigo);
          setReferencia('');
          setTalla('');
          alSeleccionar(null);
        }}
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
