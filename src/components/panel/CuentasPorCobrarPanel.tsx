'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos } from '@/lib/formato';
import styles from './comercial.module.css';

const esquemaCuentas = z.array(
  z.object({
    id: z.string().uuid(),
    ventaId: z.number().int(),
    clienteId: z.string().uuid(),
    cliente: z.string(),
    referencia: z.string(),
    talla: z.string(),
    fechaVenta: z.string(),
    fechaVencimiento: z.string().nullable(),
    total: z.number().int(),
    abonado: z.number().int(),
    saldo: z.number().int(),
    estado: z.enum(['PENDIENTE', 'ABONO_PARCIAL', 'VENCIDA', 'PAGADA']),
  }),
);
const esquemaAbonos = z.array(
  z.object({
    id: z.string().uuid(),
    monto: z.number().int(),
    metodo: z.string(),
    observacion: z.string().nullable(),
    nombreUsuario: z.string().nullable(),
    createdAt: z.string(),
  }),
);
const esquemaClientes = z.array(
  z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    activo: z.boolean(),
  }),
);

export function CuentasPorCobrarPanel() {
  const [cuentas, setCuentas] = useState<z.infer<typeof esquemaCuentas>>([]);
  const [clientes, setClientes] = useState<z.infer<typeof esquemaClientes>>([]);
  const [estado, setEstado] = useState('TODAS');
  const [clienteId, setClienteId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cuentaAbierta, setCuentaAbierta] = useState<string | null>(null);
  const [abonos, setAbonos] = useState<z.infer<typeof esquemaAbonos>>([]);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const claveAbono = useRef<string | null>(null);
  const totalFiltrado = cuentas.reduce(
    (total, cuenta) => ({
      original: total.original + BigInt(cuenta.total),
      abonado: total.abonado + BigInt(cuenta.abonado),
      saldo: total.saldo + BigInt(cuenta.saldo),
    }),
    { original: 0n, abonado: 0n, saldo: 0n },
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const parametros = new URLSearchParams({ estado });
      if (clienteId) parametros.set('clienteId', clienteId);
      if (desde) parametros.set('desde', desde);
      if (hasta) parametros.set('hasta', hasta);
      const response = await fetch(`/api/panel/cuentas-por-cobrar?${parametros}`, {
        cache: 'no-store',
      });
      setCuentas(await leerRespuestaApi(response, esquemaCuentas));
      setError('');
    } catch (capturado) {
      setError(
        capturado instanceof Error ? capturado.message : 'No se pudieron cargar las cuentas.',
      );
    } finally {
      setCargando(false);
    }
  }, [estado, clienteId, desde, hasta]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargar]);

  useEffect(() => {
    const controlador = new AbortController();
    void fetch('/api/panel/clientes', { signal: controlador.signal, cache: 'no-store' })
      .then((response) => leerRespuestaApi(response, esquemaClientes))
      .then(setClientes)
      .catch((capturado: unknown) => {
        if (capturado instanceof DOMException && capturado.name === 'AbortError') return;
        setError(
          capturado instanceof Error ? capturado.message : 'No se pudieron cargar los clientes.',
        );
      });
    return () => controlador.abort();
  }, []);

  async function cargarAbonos(id: string) {
    const response = await fetch(`/api/panel/abonos?cuentaId=${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    setAbonos(await leerRespuestaApi(response, esquemaAbonos));
    setCuentaAbierta(id);
  }

  async function consultarAbonos(id: string) {
    if (cuentaAbierta === id) {
      setCuentaAbierta(null);
      return;
    }
    setCuentaAbierta(id);
    setError('');
    try {
      await cargarAbonos(id);
    } catch (capturado) {
      setError(
        capturado instanceof Error ? capturado.message : 'No se pudo consultar el historial.',
      );
    }
  }

  async function registrar(evento: FormEvent<HTMLFormElement>, cuentaId: string) {
    evento.preventDefault();
    setError('');
    setMensaje('');
    const saldoAnterior = cuentas.find((cuenta) => cuenta.id === cuentaId)?.saldo;
    const montoRegistrado = Number(monto);
    let registrado = false;
    try {
      const claveIdempotencia = claveAbono.current ?? crypto.randomUUID();
      claveAbono.current = claveIdempotencia;
      const response = await fetch('/api/panel/abonos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuentaId,
          monto: Number(monto),
          metodo,
          observacion: observacion.trim() || undefined,
          claveIdempotencia,
        }),
      });
      await leerRespuestaApi(response, z.unknown());
      registrado = true;
      claveAbono.current = null;
      setMonto('');
      setObservacion('');
      setMensaje(
        saldoAnterior === undefined
          ? 'Abono registrado; saldo actualizado.'
          : `Abono de ${formatearPesos(montoRegistrado)} registrado. ` +
              `Saldo anterior: ${formatearPesos(saldoAnterior)}; nuevo saldo: ${formatearPesos(saldoAnterior - montoRegistrado)}.`,
      );
      await cargar();
    } catch (capturado) {
      if (!registrado) {
        setError(capturado instanceof Error ? capturado.message : 'No se pudo registrar el abono.');
        return;
      }
      setError('El abono se registró, pero no se pudo actualizar su historial.');
      return;
    }
    try {
      await cargarAbonos(cuentaId);
    } catch (capturado) {
      setError(
        capturado instanceof Error
          ? capturado.message
          : 'El abono se registró, pero no se pudo actualizar su historial.',
      );
    }
  }

  return (
    <div className={styles.panel}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      <section className={styles.tarjeta}>
        <h2>Filtros</h2>
        <div className={styles.formulario}>
          <Selector
            etiqueta="Estado"
            value={estado}
            onChange={(evento) => setEstado(evento.target.value)}
          >
            <option value="TODAS">Todas las cuentas</option>
            <option value="PENDIENTE">Sin abonos</option>
            <option value="ABONO_PARCIAL">Abono parcial</option>
            <option value="VENCIDA">Vencidas</option>
          </Selector>
          <Selector
            etiqueta="Cliente"
            value={clienteId}
            onChange={(evento) => setClienteId(evento.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes
              .filter((cliente) => cliente.activo)
              .map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
          </Selector>
          <Campo
            etiqueta="Desde"
            type="date"
            value={desde}
            onChange={(evento) => setDesde(evento.target.value)}
          />
          <Campo
            etiqueta="Hasta"
            type="date"
            value={hasta}
            onChange={(evento) => setHasta(evento.target.value)}
          />
        </div>
      </section>
      <section className={styles.tarjeta}>
        <h2>Cuentas por cobrar</h2>
        <p>
          Total original: <strong>{formatearPesos(totalFiltrado.original)}</strong> · Abonado:{' '}
          <strong>{formatearPesos(totalFiltrado.abonado)}</strong> · Saldo:{' '}
          <strong>{formatearPesos(totalFiltrado.saldo)}</strong>
        </p>
        {cargando ? (
          <p role="status">Cargando cuentas…</p>
        ) : cuentas.length === 0 ? (
          <p>No hay cuentas pendientes con estos filtros.</p>
        ) : (
          <div className={styles.tabla}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Venta</th>
                  <th>Fecha</th>
                  <th>Vencimiento</th>
                  <th>Total</th>
                  <th>Abonado</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map((cuenta) => (
                  <tr key={cuenta.id}>
                    <td>{cuenta.cliente}</td>
                    <td>
                      #{cuenta.ventaId} · {cuenta.referencia} · {cuenta.talla}
                    </td>
                    <td>{cuenta.fechaVenta}</td>
                    <td>{cuenta.fechaVencimiento ?? 'Sin fecha'}</td>
                    <td>{formatearPesos(cuenta.total)}</td>
                    <td>{formatearPesos(cuenta.abonado)}</td>
                    <td>
                      <strong>{formatearPesos(cuenta.saldo)}</strong>
                    </td>
                    <td>
                      <span className={styles.estado}>{cuenta.estado}</span>
                    </td>
                    <td>
                      <div className={styles.acciones}>
                        <Boton
                          type="button"
                          variante="secundario"
                          onClick={() => void consultarAbonos(cuenta.id)}
                        >
                          Historial
                        </Boton>
                        {cuenta.saldo > 0 && (
                          <form onSubmit={(evento) => void registrar(evento, cuenta.id)}>
                            <Campo
                              etiqueta={`Abono para cuenta ${cuenta.ventaId}`}
                              type="number"
                              min="1"
                              max={cuenta.saldo}
                              step="1"
                              value={cuentaAbierta === cuenta.id ? monto : ''}
                              onChange={(evento) => {
                                claveAbono.current = null;
                                setCuentaAbierta(cuenta.id);
                                setMonto(evento.target.value);
                              }}
                              required
                            />
                            {cuentaAbierta === cuenta.id &&
                              Number.isSafeInteger(Number(monto)) &&
                              Number(monto) > 0 &&
                              Number(monto) <= cuenta.saldo && (
                                <p className={styles.nota}>
                                  Saldo anterior: {formatearPesos(cuenta.saldo)} · Abono:{' '}
                                  {formatearPesos(Number(monto))} · Saldo resultante:{' '}
                                  {formatearPesos(cuenta.saldo - Number(monto))}
                                </p>
                              )}
                            <Selector
                              etiqueta="Método de pago"
                              value={metodo}
                              onChange={(evento) => {
                                claveAbono.current = null;
                                setMetodo(evento.target.value);
                              }}
                            >
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="TRANSFERENCIA">Transferencia</option>
                              <option value="TARJETA">Tarjeta</option>
                              <option value="OTRO">Otro</option>
                            </Selector>
                            <Campo
                              etiqueta="Observación (opcional)"
                              value={observacion}
                              onChange={(evento) => {
                                claveAbono.current = null;
                                setObservacion(evento.target.value);
                              }}
                              maxLength={300}
                            />
                            <Boton type="submit">Registrar abono</Boton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {cuentaAbierta && (
        <section className={styles.tarjeta}>
          <h2>Historial de abonos</h2>
          {abonos.length === 0 ? (
            <p>No hay abonos registrados.</p>
          ) : (
            <ul className={styles.lista}>
              {abonos.map((abono) => (
                <li className={styles.fila} key={abono.id}>
                  <span>
                    {abono.createdAt} · {abono.metodo} ·{' '}
                    {abono.nombreUsuario ?? 'Usuario sin perfil'}
                  </span>
                  <strong>{formatearPesos(abono.monto)}</strong>
                  <span>{abono.observacion ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
