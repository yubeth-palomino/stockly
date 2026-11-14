'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { leerRespuestaApi } from '@/lib/http/cliente';
import estilosUi from '@/components/ui/ui.module.css';
import styles from './comercial.module.css';

const esquemaProveedor = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  identificacion: z.string().nullable(),
  contacto: z.string().nullable(),
  telefono: z.string().nullable(),
  correo: z.string().nullable(),
  direccion: z.string().nullable(),
  observaciones: z.string().nullable(),
  activo: z.boolean(),
});

export function DetalleProveedorPanel({ id }: { id: string }) {
  const [proveedor, setProveedor] = useState<z.infer<typeof esquemaProveedor> | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();
    void fetch(`/api/panel/proveedores/${encodeURIComponent(id)}`, {
      signal: controlador.signal,
      cache: 'no-store',
    })
      .then((response) => leerRespuestaApi(response, esquemaProveedor))
      .then(setProveedor)
      .catch((capturado: unknown) => {
        if (capturado instanceof DOMException && capturado.name === 'AbortError') return;
        setError(
          capturado instanceof Error ? capturado.message : 'No se pudo cargar el proveedor.',
        );
      })
      .finally(() => setCargando(false));
    return () => controlador.abort();
  }, [id]);

  if (cargando) return <p role="status">Cargando proveedor…</p>;
  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!proveedor) return <Aviso tipo="error">No se encontró el proveedor solicitado.</Aviso>;

  return (
    <section className={styles.tarjeta}>
      <h2>{proveedor.nombre}</h2>
      <p>Identificación: {proveedor.identificacion ?? '—'}</p>
      <p>Contacto: {proveedor.contacto ?? '—'}</p>
      <p>
        Teléfono: {proveedor.telefono ?? '—'} · Correo: {proveedor.correo ?? '—'}
      </p>
      <p>Dirección: {proveedor.direccion ?? '—'}</p>
      <p>Estado: {proveedor.activo ? 'Activo' : 'Inactivo'}</p>
      <p>Observaciones: {proveedor.observaciones ?? '—'}</p>
      <p className={styles.nota}>No hay compras ni cuentas por pagar asociadas en el sistema.</p>
      <Link
        className={`${estilosUi.boton} ${estilosUi.boton_secundario}`}
        href="/panel/proveedores"
      >
        Volver a proveedores
      </Link>
    </section>
  );
}
