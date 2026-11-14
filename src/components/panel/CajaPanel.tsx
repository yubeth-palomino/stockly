'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { Selector } from '@/components/ui/Selector';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos } from '@/lib/formato';
import styles from './comercial.module.css';

const esquemaCaja = z.object({
  id: z.string().uuid(),
  estado: z.enum(['ABIERTA', 'CERRADA']),
  montoApertura: z.number().int(),
  montoEsperado: z.number().int(),
  montoContado: z.number().int().nullable(),
  diferencia: z.number().int().nullable(),
  abiertaPor: z.string().nullable(),
  cerradaPor: z.string().nullable(),
  abiertaPorNombre: z.string().nullable(),
  cerradaPorNombre: z.string().nullable(),
  abiertaEn: z.string(),
  cerradaEn: z.string().nullable(),
  observacionApertura: z.string().nullable(),
  observacionCierre: z.string().nullable(),
  porMetodo: z.array(z.object({ metodo: z.string(), monto: z.number().int() })),
  ventasRecibidasPorMetodo: z.array(z.object({ metodo: z.string(), monto: z.number().int() })),
  abonosRecibidosPorMetodo: z.array(z.object({ metodo: z.string(), monto: z.number().int() })),
  movimientos: z.array(
    z.object({
      id: z.string(),
      tipo: z.enum(['INGRESO', 'EGRESO']),
      metodo: z.string(),
      origen: z.enum(['VENTA', 'ABONO', 'MANUAL']),
      monto: z.number().int(),
      concepto: z.string(),
      creadoPorNombre: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
const esquemaRespuesta = z.object({
  actual: esquemaCaja.nullable(),
  historial: z.array(esquemaCaja),
});

export function CajaPanel() {
  const [actual, setActual] = useState<z.infer<typeof esquemaCaja> | null>(null);
  const [historial, setHistorial] = useState<z.infer<typeof esquemaCaja>[]>([]);
  const [montoApertura, setMontoApertura] = useState('');
  const [montoContado, setMontoContado] = useState('');
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO'>(
    'EFECTIVO',
  );
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [detalleCaja, setDetalleCaja] = useState<z.infer<typeof esquemaCaja> | null>(null);
  const claveApertura = useRef<string | null>(null);
  const claveMovimiento = useRef<string | null>(null);
  const claveCierre = useRef<string | null>(null);

  const cargar = useCallback(async () => {
    setCargandoDatos(true);
    try {
      const response = await fetch('/api/panel/caja', { cache: 'no-store' });
      const datos = await leerRespuestaApi(response, esquemaRespuesta);
      setActual(datos.actual);
      setHistorial(datos.historial);
      setError('');
    } catch (capturado) {
      setError(capturado instanceof Error ? capturado.message : 'No se pudo consultar la caja.');
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargar]);

  async function enviar(
    evento: FormEvent<HTMLFormElement>,
    ruta: string,
    datos: Record<string, unknown>,
    exito: string,
  ) {
    evento.preventDefault();
    setCargando(true);
    setError('');
    setMensaje('');
    try {
      const response = await fetch(ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      await leerRespuestaApi(response, z.unknown());
      if (ruta === '/api/panel/caja') {
        claveApertura.current = null;
        setMontoApertura('');
      }
      if (ruta === '/api/panel/caja/movimientos') {
        claveMovimiento.current = null;
        setMonto('');
        setConcepto('');
      }
      if (ruta === '/api/panel/caja/cierre') {
        claveCierre.current = null;
        setMontoContado('');
        setConfirmarCierre(false);
      }
      setMensaje(exito);
      await cargar();
    } catch (capturado) {
      setError(capturado instanceof Error ? capturado.message : 'No se pudo guardar la operación.');
    } finally {
      setCargando(false);
    }
  }

  async function consultarDetalleCaja(id: string) {
    setError('');
    try {
      const response = await fetch(`/api/panel/caja/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });
      setDetalleCaja(await leerRespuestaApi(response, esquemaCaja));
    } catch (capturado) {
      setError(
        capturado instanceof Error
          ? capturado.message
          : 'No se pudo consultar el detalle del cierre.',
      );
    }
  }

  const efectivo = actual?.porMetodo.find((item) => item.metodo === 'EFECTIVO')?.monto ?? 0;

  return (
    <div className={styles.panel}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      {cargandoDatos ? (
        <p role="status">Cargando caja…</p>
      ) : actual ? (
        <>
          <section className={styles.metricas} aria-label="Resumen de caja">
            <div className={styles.metrica}>
              <span>Estado</span>
              <strong>Abierta</strong>
            </div>
            <div className={styles.metrica}>
              <span>Apertura</span>
              <strong>{formatearPesos(actual.montoApertura)}</strong>
            </div>
            <div className={styles.metrica}>
              <span>Responsable de apertura</span>
              <strong>{actual.abiertaPorNombre ?? 'Cuenta desactivada'}</strong>
            </div>
            <div className={styles.metrica}>
              <span>Abierta</span>
              <strong>{actual.abiertaEn}</strong>
            </div>
            <div className={styles.metrica}>
              <span>Efectivo esperado</span>
              <strong>{formatearPesos(actual.montoEsperado)}</strong>
            </div>
            <div className={styles.metrica}>
              <span>Otros medios netos</span>
              <strong>
                {formatearPesos(
                  actual.porMetodo
                    .filter((item) => item.metodo !== 'EFECTIVO')
                    .reduce((suma, item) => suma + item.monto, 0),
                )}
              </strong>
            </div>
          </section>
          <section className={styles.tarjeta}>
            <h2>Movimientos por medio</h2>
            <ul className={styles.lista}>
              {actual.porMetodo.map((item) => (
                <li className={styles.fila} key={item.metodo}>
                  <span>{item.metodo}</span>
                  <strong>{formatearPesos(item.monto)}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.tarjeta}>
            <h2>Ventas recibidas por medio</h2>
            <ul className={styles.lista}>
              {actual.ventasRecibidasPorMetodo.map((item) => (
                <li className={styles.fila} key={item.metodo}>
                  <span>{item.metodo}</span>
                  <strong>{formatearPesos(item.monto)}</strong>
                </li>
              ))}
            </ul>
            <h2>Abonos recibidos por medio</h2>
            <ul className={styles.lista}>
              {actual.abonosRecibidosPorMetodo.map((item) => (
                <li className={styles.fila} key={item.metodo}>
                  <span>{item.metodo}</span>
                  <strong>{formatearPesos(item.monto)}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.tarjeta}>
            <h2>Registrar ingreso o egreso manual</h2>
            <form
              className={styles.formulario}
              onSubmit={(evento) =>
                void enviar(
                  evento,
                  '/api/panel/caja/movimientos',
                  {
                    tipo,
                    metodo,
                    monto: Number(monto),
                    concepto,
                    claveIdempotencia:
                      claveMovimiento.current ?? (claveMovimiento.current = crypto.randomUUID()),
                  },
                  'Movimiento registrado.',
                )
              }
            >
              <Selector
                etiqueta="Tipo"
                value={tipo}
                onChange={(evento) => {
                  claveMovimiento.current = null;
                  setTipo(evento.target.value as typeof tipo);
                }}
              >
                <option value="INGRESO">Ingreso</option>
                <option value="EGRESO">Egreso</option>
              </Selector>
              <Selector
                etiqueta="Medio"
                value={metodo}
                onChange={(evento) => {
                  claveMovimiento.current = null;
                  setMetodo(evento.target.value as typeof metodo);
                }}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="OTRO">Otro</option>
              </Selector>
              <Campo
                etiqueta="Monto en pesos"
                type="number"
                min="1"
                step="1"
                value={monto}
                onChange={(evento) => {
                  claveMovimiento.current = null;
                  setMonto(evento.target.value);
                }}
                required
              />
              <Campo
                etiqueta="Concepto"
                value={concepto}
                onChange={(evento) => {
                  claveMovimiento.current = null;
                  setConcepto(evento.target.value);
                }}
                maxLength={240}
                required
              />
              <div className={styles.anchoCompleto}>
                <Boton type="submit" cargando={cargando}>
                  Guardar movimiento
                </Boton>
              </div>
            </form>
          </section>
          <section className={styles.tarjeta}>
            <h2>Cerrar caja</h2>
            <p className={styles.nota}>
              El efectivo esperado no incluye transferencias, tarjetas ni otros medios.
            </p>
            <form
              className={styles.formulario}
              onSubmit={(evento) => {
                evento.preventDefault();
                setConfirmarCierre(true);
              }}
            >
              <Campo
                etiqueta="Efectivo contado"
                type="number"
                min="0"
                step="1"
                value={montoContado}
                onChange={(evento) => {
                  claveCierre.current = null;
                  setMontoContado(evento.target.value);
                }}
                required
              />
              <p>
                Esperado: <strong>{formatearPesos(actual.montoEsperado)}</strong> · Diferencia
                estimada:{' '}
                <strong>
                  {formatearPesos((Number(montoContado) || 0) - actual.montoEsperado)}
                </strong>
              </p>
              <div className={styles.anchoCompleto}>
                <Boton type="submit" variante="peligro">
                  Continuar al cierre
                </Boton>
              </div>
            </form>
          </section>
          <section className={styles.tarjeta}>
            <h2>Movimientos recientes</h2>
            {actual.movimientos.length === 0 ? (
              <p>No hay movimientos registrados.</p>
            ) : (
              <div className={styles.tabla}>
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Medio</th>
                      <th>Concepto</th>
                      <th>Monto</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actual.movimientos.map((movimiento) => (
                      <tr key={movimiento.id}>
                        <td>{movimiento.createdAt}</td>
                        <td>{movimiento.tipo}</td>
                        <td>
                          {movimiento.origen} · {movimiento.metodo}
                        </td>
                        <td>{movimiento.concepto}</td>
                        <td>{formatearPesos(movimiento.monto)}</td>
                        <td>{movimiento.creadoPorNombre ?? 'Cuenta desactivada'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className={styles.tarjeta}>
          <h2>Abrir caja</h2>
          <form
            className={styles.formulario}
            onSubmit={(evento) =>
              void enviar(
                evento,
                '/api/panel/caja',
                {
                  montoApertura: Number(montoApertura),
                  claveApertura:
                    claveApertura.current ?? (claveApertura.current = crypto.randomUUID()),
                },
                'Caja abierta.',
              )
            }
          >
            <Campo
              etiqueta="Monto inicial en efectivo"
              type="number"
              min="0"
              step="1"
              value={montoApertura}
              onChange={(evento) => {
                claveApertura.current = null;
                setMontoApertura(evento.target.value);
              }}
              required
            />
            <div className={styles.anchoCompleto}>
              <Boton type="submit" cargando={cargando}>
                Abrir caja
              </Boton>
            </div>
          </form>
        </section>
      )}
      <section className={styles.tarjeta}>
        <h2>Historial de cierres</h2>
        {historial.length === 0 ? (
          <p>No hay cierres registrados.</p>
        ) : (
          <div className={styles.tabla}>
            <table>
              <thead>
                <tr>
                  <th>Apertura</th>
                  <th>Responsable</th>
                  <th>Cierre</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferencia</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((caja) => (
                  <tr key={caja.id}>
                    <td>{caja.abiertaEn}</td>
                    <td>{caja.cerradaPorNombre ?? 'Cuenta desactivada'}</td>
                    <td>{caja.cerradaEn}</td>
                    <td>{formatearPesos(caja.montoEsperado)}</td>
                    <td>{caja.montoContado === null ? '—' : formatearPesos(caja.montoContado)}</td>
                    <td>{caja.diferencia === null ? '—' : formatearPesos(caja.diferencia)}</td>
                    <td>
                      <Boton
                        type="button"
                        variante="secundario"
                        onClick={() => void consultarDetalleCaja(caja.id)}
                      >
                        Movimientos
                      </Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <span className={styles.nota}>Efectivo neto de caja: {formatearPesos(efectivo)}.</span>
      {detalleCaja && (
        <section className={styles.tarjeta}>
          <div className={styles.encabezadoDetalle}>
            <h2>Detalle del cierre · {detalleCaja.abiertaEn}</h2>
            <Boton type="button" variante="fantasma" onClick={() => setDetalleCaja(null)}>
              Cerrar detalle
            </Boton>
          </div>
          <p>
            Apertura: {detalleCaja.abiertaPorNombre ?? 'Cuenta desactivada'} · Cierre:{' '}
            {detalleCaja.cerradaPorNombre ?? 'Cuenta desactivada'} · Contado:{' '}
            {detalleCaja.montoContado === null ? '—' : formatearPesos(detalleCaja.montoContado)} ·
            Diferencia:{' '}
            {detalleCaja.diferencia === null ? '—' : formatearPesos(detalleCaja.diferencia)}
          </p>
          {detalleCaja.movimientos.length === 0 ? (
            <p>No hay movimientos registrados.</p>
          ) : (
            <div className={styles.tabla}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Origen</th>
                    <th>Tipo</th>
                    <th>Medio</th>
                    <th>Concepto</th>
                    <th>Monto</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {detalleCaja.movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td>{movimiento.createdAt}</td>
                      <td>{movimiento.origen}</td>
                      <td>{movimiento.tipo}</td>
                      <td>{movimiento.metodo}</td>
                      <td>{movimiento.concepto}</td>
                      <td>{formatearPesos(movimiento.monto)}</td>
                      <td>{movimiento.creadoPorNombre ?? 'Cuenta desactivada'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <Modal
        abierto={confirmarCierre}
        titulo="Confirmar cierre de caja"
        onCerrar={() => setConfirmarCierre(false)}
      >
        <p>
          El cierre es definitivo. Verifique el efectivo contado y la diferencia antes de confirmar.
        </p>
        <form
          className={styles.acciones}
          onSubmit={(evento) =>
            void enviar(
              evento,
              '/api/panel/caja/cierre',
              {
                montoContado: Number(montoContado),
                claveCierre: claveCierre.current ?? (claveCierre.current = crypto.randomUUID()),
              },
              'Caja cerrada.',
            )
          }
        >
          <Boton type="submit" variante="peligro" cargando={cargando}>
            Confirmar cierre definitivo
          </Boton>
          <Boton type="button" variante="secundario" onClick={() => setConfirmarCierre(false)}>
            Volver
          </Boton>
        </form>
      </Modal>
    </div>
  );
}
