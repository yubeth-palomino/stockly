'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos } from '@/lib/formato';
import estilosUi from '@/components/ui/ui.module.css';
import styles from './comercial.module.css';

const esquemaDetalle = z.object({
  cliente: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    identificacion: z.string().nullable(),
    telefono: z.string().nullable(),
    correo: z.string().nullable(),
    direccion: z.string().nullable(),
    observaciones: z.string().nullable(),
  }),
  ventas: z.array(
    z.object({
      id: z.number().int(),
      referencia: z.string(),
      talla: z.string(),
      cantidad: z.number().int(),
      total: z.number().int(),
      fechaVenta: z.string(),
      pagado: z.number().int(),
      saldo: z.number().int(),
      fechaVencimiento: z.string().nullable(),
      estado: z.enum(['PAGADA', 'PENDIENTE', 'VENCIDA']),
    }),
  ),
});

export function DetalleClientePanel({ id }: { id: string }) {
  const [detalle, setDetalle] = useState<z.infer<typeof esquemaDetalle> | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();
    void fetch(`/api/panel/clientes/${encodeURIComponent(id)}`, {
      signal: controlador.signal,
      cache: 'no-store',
    })
      .then((response) => leerRespuestaApi(response, esquemaDetalle))
      .then(setDetalle)
      .catch((capturado: unknown) => {
        if (capturado instanceof DOMException && capturado.name === 'AbortError') return;
        setError(capturado instanceof Error ? capturado.message : 'No se pudo cargar el cliente.');
      })
      .finally(() => setCargando(false));
    return () => controlador.abort();
  }, [id]);

  if (cargando) return <p role="status">Cargando historial del cliente…</p>;
  if (error) return <Aviso tipo="error">{error}</Aviso>;
  if (!detalle) return <Aviso tipo="error">No se encontró el cliente solicitado.</Aviso>;

  const { cliente, ventas } = detalle;
  const saldoTotal = ventas.reduce((total, venta) => total + venta.saldo, 0);

  return (
    <div className={styles.panel}>
      <section className={styles.tarjeta}>
        <h2>{cliente.nombre}</h2>
        <p>Identificación: {cliente.identificacion ?? '—'}</p>
        <p>
          Teléfono: {cliente.telefono ?? '—'} · Correo: {cliente.correo ?? '—'}
        </p>
        <p>Dirección: {cliente.direccion ?? '—'}</p>
        {cliente.observaciones && <p>Observaciones: {cliente.observaciones}</p>}
        <p>
          Saldo pendiente: <strong>{formatearPesos(saldoTotal)}</strong>
        </p>
        <Link className={`${estilosUi.boton} ${estilosUi.boton_secundario}`} href="/panel/clientes">
          Volver a clientes
        </Link>
      </section>
      <section className={styles.tarjeta}>
        <h2>Historial de ventas</h2>
        {ventas.length === 0 ? (
          <p>Este cliente no tiene ventas asociadas.</p>
        ) : (
          <div className={styles.tabla}>
            <table>
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id}>
                    <td>
                      #{venta.id} · {venta.referencia} · Talla {venta.talla} · {venta.cantidad} ud.
                    </td>
                    <td>{venta.fechaVenta}</td>
                    <td>{formatearPesos(venta.total)}</td>
                    <td>{formatearPesos(venta.pagado)}</td>
                    <td>{formatearPesos(venta.saldo)}</td>
                    <td>{venta.fechaVencimiento ?? '—'}</td>
                    <td>
                      <span className={styles.estado}>{venta.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
