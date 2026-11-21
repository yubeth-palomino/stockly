'use client';

import { z } from 'zod';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { EscanerCamara } from '@/components/panel/EscanerCamara';
import { leerRespuestaApi } from '@/lib/http/cliente';
import type { FiltrosInventarioValidos } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

const esquemaResultadosEscaneo = z.array(
  z.object({
    id: z.string().uuid(),
    referencia: z.string(),
    talla: z.string(),
    marca: z.string(),
    descripcion: z.string(),
  }),
);

export function FiltrosInventario({ filtros }: { filtros: FiltrosInventarioValidos }) {
  const router = useRouter();
  const pathname = usePathname();
  const [referencia, setReferencia] = useState(filtros.referencia ?? '');
  const [codigoBarras, setCodigoBarras] = useState(filtros.codigoBarras ?? '');
  const [marca, setMarca] = useState(filtros.marca ?? '');
  const [talla, setTalla] = useState(filtros.talla ?? '');
  const [soloDisponibles, setSoloDisponibles] = useState(filtros.soloDisponibles ?? false);
  const [resultadosEscaneo, setResultadosEscaneo] = useState<
    z.infer<typeof esquemaResultadosEscaneo>
  >([]);
  const [mensajeEscaneo, setMensajeEscaneo] = useState('');
  const [buscandoEscaneo, setBuscandoEscaneo] = useState(false);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const parametros = new URLSearchParams();
      if (referencia.trim()) parametros.set('referencia', referencia.trim());
      if (codigoBarras.trim()) parametros.set('codigoBarras', codigoBarras.trim());
      if (marca.trim()) parametros.set('marca', marca.trim());
      if (talla.trim()) parametros.set('talla', talla.trim());
      if (soloDisponibles) parametros.set('soloDisponibles', 'true');
      const consulta = parametros.toString();
      router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(temporizador);
  }, [codigoBarras, marca, pathname, referencia, router, soloDisponibles, talla]);

  function limpiarFiltros() {
    setReferencia('');
    setCodigoBarras('');
    setMarca('');
    setTalla('');
    setSoloDisponibles(false);
    router.replace(pathname, { scroll: false });
  }

  async function buscarEscaneado(codigo: string) {
    setResultadosEscaneo([]);
    setMensajeEscaneo('');
    setBuscandoEscaneo(true);
    try {
      const parametros = new URLSearchParams({ codigo });
      const response = await fetch(`/api/panel/productos/buscar-escaneado?${parametros}`, {
        cache: 'no-store',
      });
      const productos = await leerRespuestaApi(response, esquemaResultadosEscaneo);
      if (productos.length === 0) {
        setMensajeEscaneo('Producto no encontrado.');
        return;
      }
      if (productos.length === 1) {
        const [producto] = productos;
        if (producto) router.push(`/panel/inventario/${producto.id}`);
        return;
      }
      setResultadosEscaneo(productos);
      setMensajeEscaneo('Hay varias tallas para esta referencia. Selecciona el producto:');
    } catch (error) {
      setMensajeEscaneo(
        error instanceof Error ? error.message : 'No se pudo buscar el producto escaneado.',
      );
    } finally {
      setBuscandoEscaneo(false);
    }
  }

  return (
    <section className={styles.filtros} aria-label="Filtros de inventario">
      <Campo
        etiqueta="Buscar producto"
        value={referencia}
        onChange={(evento) => setReferencia(evento.target.value)}
        placeholder="Buscar producto..."
        className={styles.campoBusqueda}
        autoComplete="off"
      />
      <Campo
        etiqueta="Código de barras"
        value={codigoBarras}
        onChange={(evento) => setCodigoBarras(evento.target.value)}
        autoComplete="off"
        inputMode="numeric"
      />
      <div className={styles.busquedaEscaneada}>
        <EscanerCamara alLeer={(codigo) => void buscarEscaneado(codigo)} />
        {buscandoEscaneo && <p role="status">Buscando el producto escaneado…</p>}
        {!buscandoEscaneo && mensajeEscaneo && <p role="status">{mensajeEscaneo}</p>}
        {resultadosEscaneo.map((producto) => (
          <Boton
            key={producto.id}
            variante="secundario"
            type="button"
            onClick={() => router.push(`/panel/inventario/${producto.id}`)}
          >
            {producto.referencia} · Talla {producto.talla} · {producto.marca}
          </Boton>
        ))}
      </div>
      <Campo
        etiqueta="Marca"
        value={marca}
        onChange={(evento) => setMarca(evento.target.value)}
        autoComplete="off"
      />
      <Campo
        etiqueta="Talla"
        value={talla}
        onChange={(evento) => setTalla(evento.target.value)}
        autoComplete="off"
      />
      <label className={styles.filtroDisponibles}>
        <input
          type="checkbox"
          checked={soloDisponibles}
          onChange={(evento) => setSoloDisponibles(evento.target.checked)}
        />
        Solo disponibles
      </label>
      <Boton variante="secundario" type="button" onClick={limpiarFiltros}>
        Limpiar filtros
      </Boton>
    </section>
  );
}
