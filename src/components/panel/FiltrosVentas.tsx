'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import type { FiltrosVentasValidos } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

export function FiltrosVentas({ filtros }: { filtros: FiltrosVentasValidos }) {
  const router = useRouter();
  const pathname = usePathname();
  const [referencia, setReferencia] = useState(filtros.referencia ?? '');
  const [desde, setDesde] = useState(filtros.desde ?? '');
  const [hasta, setHasta] = useState(filtros.hasta ?? '');

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      const parametros = new URLSearchParams();
      if (referencia.trim()) parametros.set('referencia', referencia.trim());
      if (desde) parametros.set('desde', desde);
      if (hasta) parametros.set('hasta', hasta);
      const consulta = parametros.toString();
      router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
    }, referencia.trim() ? 300 : 0);
    return () => window.clearTimeout(temporizador);
  }, [desde, hasta, pathname, referencia, router]);

  function limpiarFiltros() {
    setReferencia('');
    setDesde('');
    setHasta('');
    router.replace(pathname, { scroll: false });
  }

  return (
    <section className={styles.filtros} aria-label="Filtros de ventas">
      <Campo etiqueta="Referencia" value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />
      <Campo etiqueta="Desde" type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} />
      <Campo etiqueta="Hasta" type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} />
      <Boton variante="secundario" type="button" onClick={limpiarFiltros}>Limpiar filtros</Boton>
    </section>
  );
}
