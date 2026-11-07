'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import type { FiltrosInventarioValidos } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

export function FiltrosInventario({
  filtros,
}: {
  filtros: FiltrosInventarioValidos;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [referencia, setReferencia] = useState(filtros.referencia ?? '');
  const [marca, setMarca] = useState(filtros.marca ?? '');
  const [talla, setTalla] = useState(filtros.talla ?? '');
  const [soloDisponibles, setSoloDisponibles] = useState(filtros.soloDisponibles ?? false);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const parametros = new URLSearchParams();
      if (referencia.trim()) parametros.set('referencia', referencia.trim());
      if (marca.trim()) parametros.set('marca', marca.trim());
      if (talla.trim()) parametros.set('talla', talla.trim());
      if (soloDisponibles) parametros.set('soloDisponibles', 'true');
      const consulta = parametros.toString();
      router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
    }, 300);
    return () => window.clearTimeout(temporizador);
  }, [marca, pathname, referencia, router, soloDisponibles, talla]);

  function limpiarFiltros() {
    setReferencia('');
    setMarca('');
    setTalla('');
    setSoloDisponibles(false);
    router.replace(pathname, { scroll: false });
  }

  return (
    <section className={styles.filtros} aria-label="Filtros de inventario">
      <Campo
        etiqueta="Referencia"
        value={referencia}
        onChange={(evento) => setReferencia(evento.target.value)}
        autoComplete="off"
      />
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
