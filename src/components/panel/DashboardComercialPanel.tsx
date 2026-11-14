'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos, formatearCantidad } from '@/lib/formato';
import styles from './comercial.module.css';

const esquemaDashboard = z.object({
  filtros: z.object({ desde: z.string(), hasta: z.string() }),
  vendido: z.number().int(),
  transacciones: z.number().int(),
  promedioVenta: z.number().int().nullable(),
  unidades: z.number().int(),
  vendidoHoy: z.number().int(),
  vendidoSemana: z.number().int(),
  vendidoMes: z.number().int(),
  ventasPagadas: z.number().int(),
  ventasCredito: z.number().int(),
  valorVentasPagadas: z.number().int(),
  valorVentasCredito: z.number().int(),
  pagosHistoricosSinClasificar: z.number().int(),
  pagosRecibidos: z.number().int(),
  abonosRecibidos: z.number().int(),
  saldoPendiente: z.number().int(),
  clientesConSaldo: z.number().int(),
  pagosPorMetodo: z.array(z.object({ metodo: z.string(), monto: z.number().int() })),
  serie: z.array(z.object({ fecha: z.string(), vendido: z.number().int() })),
  serieAbonos: z.array(z.object({ fecha: z.string(), monto: z.number().int() })),
  seriesAgrupadas: z.array(
    z.object({
      periodo: z.enum(['SEMANA', 'MES']),
      fecha: z.string(),
      vendido: z.number().int(),
    }),
  ),
  productosMasVendidos: z.array(
    z.object({
      referencia: z.string(),
      talla: z.string(),
      unidades: z.number().int(),
      vendido: z.number().int(),
    }),
  ),
  stockAgotado: z.number().int(),
  stockBajo: z.number().int(),
  ventasRecientes: z.array(
    z.object({
      id: z.number().int(),
      referencia: z.string(),
      talla: z.string(),
      cantidad: z.number().int(),
      total: z.number().int(),
      fechaVenta: z.string(),
    }),
  ),
  cuentasPorVencer: z.array(
    z.object({
      id: z.string().uuid(),
      cliente: z.string(),
      saldo: z.number().int(),
      vencimiento: z.string().nullable(),
    }),
  ),
});

function GraficoSerie({
  titulo,
  filas,
  formatear,
}: {
  titulo: string;
  filas: Array<{ fecha: string; valor: number }>;
  formatear: (valor: number) => string;
}) {
  const maximo = Math.max(1, ...filas.map((fila) => fila.valor));
  return (
    <section className={styles.tarjeta}>
      <h2>{titulo}</h2>
      {filas.length === 0 ? (
        <p>No hay datos en el período seleccionado.</p>
      ) : (
        <div className={styles.barraSerie} role="img" aria-label={titulo}>
          {filas.map((fila) => (
            <div
              className={styles.barraItem}
              key={fila.fecha}
              title={`${fila.fecha}: ${formatear(fila.valor)}`}
            >
              <div className={styles.barraGrafico}>
                <span style={{ height: `${Math.max(1, (fila.valor / maximo) * 100)}%` }} />
              </div>
              <span>{fila.fecha}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardComercialPanel() {
  const [rango, setRango] = useState('30dias');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [datos, setDatos] = useState<z.infer<typeof esquemaDashboard> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (rango === 'personalizado' && (!desde || !hasta)) {
      setDatos(null);
      setError('');
      setCargando(false);
      return;
    }
    if (rango === 'personalizado' && desde > hasta) {
      setDatos(null);
      setError('La fecha inicial no puede ser posterior a la final.');
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const parametros = new URLSearchParams({ rango });
      if (rango === 'personalizado') {
        parametros.set('desde', desde);
        parametros.set('hasta', hasta);
      }
      const response = await fetch(`/api/panel/dashboard?${parametros}`, { cache: 'no-store' });
      setDatos(await leerRespuestaApi(response, esquemaDashboard));
      setError('');
    } catch (capturado) {
      setError(capturado instanceof Error ? capturado.message : 'No se pudo cargar el dashboard.');
    } finally {
      setCargando(false);
    }
  }, [rango, desde, hasta]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(temporizador);
  }, [cargar]);

  const maximoSerie = Math.max(1, ...(datos?.serie.map((fila) => fila.vendido) ?? []));

  return (
    <div className={styles.panel}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <section className={styles.tarjeta}>
        <Selector
          etiqueta="Período del dashboard"
          value={rango}
          onChange={(evento) => setRango(evento.target.value)}
        >
          <option value="7dias">Últimos 7 días</option>
          <option value="30dias">Últimos 30 días</option>
          <option value="mes">Mes actual</option>
          <option value="anio">Año actual</option>
          <option value="personalizado">Rango personalizado</option>
        </Selector>
        {rango === 'personalizado' && (
          <div className={styles.formulario}>
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
        )}
        {datos && (
          <p className={styles.nota}>
            Del {datos.filtros.desde} al {datos.filtros.hasta}, zona horaria America/Bogota.
          </p>
        )}
      </section>
      {cargando ? (
        <p role="status">Cargando indicadores…</p>
      ) : (
        datos && (
          <>
            <section className={styles.metricas} aria-label="Indicadores del período">
              <div className={styles.metrica}>
                <span>Valor vendido hoy</span>
                <strong>{formatearPesos(datos.vendidoHoy)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Valor vendido esta semana</span>
                <strong>{formatearPesos(datos.vendidoSemana)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Valor vendido este mes</span>
                <strong>{formatearPesos(datos.vendidoMes)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Valor vendido en el período</span>
                <strong>{formatearPesos(datos.vendido)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Ventas registradas</span>
                <strong>{formatearCantidad(datos.transacciones)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Ventas registradas pagadas / a crédito</span>
                <strong>
                  {datos.ventasPagadas} / {datos.ventasCredito}
                </strong>
              </div>
              <div className={styles.metrica}>
                <span>Promedio por venta</span>
                <strong>
                  {datos.promedioVenta === null ? '—' : formatearPesos(datos.promedioVenta)}
                </strong>
              </div>
              <div className={styles.metrica}>
                <span>Unidades vendidas</span>
                <strong>{formatearCantidad(datos.unidades)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Dinero recibido (pagos y abonos)</span>
                <strong>{formatearPesos(datos.pagosRecibidos)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Abonos recibidos</span>
                <strong>{formatearPesos(datos.abonosRecibidos)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Saldo pendiente</span>
                <strong>{formatearPesos(datos.saldoPendiente)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Clientes con saldo</span>
                <strong>{formatearCantidad(datos.clientesConSaldo)}</strong>
              </div>
              <div className={styles.metrica}>
                <span>Stock bajo / agotado</span>
                <strong>
                  {datos.stockBajo} / {datos.stockAgotado}
                </strong>
              </div>
            </section>
            {datos.pagosHistoricosSinClasificar > 0 && (
              <Aviso tipo="advertencia">
                {datos.pagosHistoricosSinClasificar} venta(s) en este período no tienen medio de
                pago confiable. No se imputan a efectivo ni a otros medios. La utilidad histórica no
                está disponible porque el costo por venta no es verificable.
              </Aviso>
            )}
            <section className={styles.tarjeta}>
              <h2>Valor vendido por día</h2>
              {datos.serie.length === 0 ? (
                <p>No hay ventas en el período seleccionado.</p>
              ) : (
                <div
                  className={styles.barraSerie}
                  role="img"
                  aria-label="Gráfico de valor vendido por día"
                >
                  {datos.serie.map((fila) => (
                    <div
                      className={styles.barraItem}
                      key={fila.fecha}
                      title={`${fila.fecha}: ${formatearPesos(fila.vendido)}`}
                    >
                      <div className={styles.barraGrafico}>
                        <span
                          style={{ height: `${Math.max(1, (fila.vendido / maximoSerie) * 100)}%` }}
                        />
                      </div>
                      <span>{fila.fecha.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <GraficoSerie
              titulo="Valor vendido por semana"
              filas={datos.seriesAgrupadas
                .filter((fila) => fila.periodo === 'SEMANA')
                .map((fila) => ({ fecha: fila.fecha, valor: fila.vendido }))}
              formatear={formatearPesos}
            />
            <GraficoSerie
              titulo="Valor vendido por mes"
              filas={datos.seriesAgrupadas
                .filter((fila) => fila.periodo === 'MES')
                .map((fila) => ({ fecha: fila.fecha, valor: fila.vendido }))}
              formatear={formatearPesos}
            />
            <GraficoSerie
              titulo="Abonos recibidos por día"
              filas={datos.serieAbonos.map((fila) => ({ fecha: fila.fecha, valor: fila.monto }))}
              formatear={formatearPesos}
            />
            <GraficoSerie
              titulo="Valor vendido: pagadas frente a crédito"
              filas={[
                { fecha: 'Pagadas', valor: datos.valorVentasPagadas },
                { fecha: 'A crédito', valor: datos.valorVentasCredito },
              ]}
              formatear={formatearPesos}
            />
            <section className={styles.tarjeta}>
              <h2>Pagos recibidos por medio</h2>
              {datos.pagosPorMetodo.length === 0 ? (
                <p>No hay pagos clasificados en este período.</p>
              ) : (
                <ul className={styles.lista}>
                  {datos.pagosPorMetodo.map((pago) => (
                    <li className={styles.fila} key={pago.metodo}>
                      <span>{pago.metodo}</span>
                      <strong>{formatearPesos(pago.monto)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              {datos.pagosPorMetodo.length > 0 && (
                <GraficoSerie
                  titulo="Distribución de pagos y abonos por medio"
                  filas={datos.pagosPorMetodo.map((pago) => ({
                    fecha: pago.metodo,
                    valor: pago.monto,
                  }))}
                  formatear={formatearPesos}
                />
              )}
            </section>
            <section className={styles.tarjeta}>
              <h2>Productos más vendidos</h2>
              {datos.productosMasVendidos.length === 0 ? (
                <p>No hay productos vendidos en este período.</p>
              ) : (
                <ul className={styles.lista}>
                  {datos.productosMasVendidos.map((producto) => (
                    <li className={styles.fila} key={`${producto.referencia}-${producto.talla}`}>
                      <span>
                        {producto.referencia} · Talla {producto.talla}
                      </span>
                      <span>{formatearCantidad(producto.unidades)} unidades</span>
                      <strong>{formatearPesos(producto.vendido)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className={styles.tarjeta}>
              <h2>Cuentas vencidas o próximas a vencer</h2>
              {datos.cuentasPorVencer.length === 0 ? (
                <p>No hay cuentas vencidas o con vencimiento hoy.</p>
              ) : (
                <ul className={styles.lista}>
                  {datos.cuentasPorVencer.map((cuenta) => (
                    <li className={styles.fila} key={cuenta.id}>
                      <span>
                        {cuenta.cliente} · {cuenta.vencimiento ?? 'Sin vencimiento'}
                      </span>
                      <strong>{formatearPesos(cuenta.saldo)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/panel/cuentas-por-cobrar">Ver todas las cuentas por cobrar</Link>
            </section>
            <section className={styles.tarjeta}>
              <h2>Ventas recientes</h2>
              {datos.ventasRecientes.length === 0 ? (
                <p>No hay ventas registradas.</p>
              ) : (
                <ul className={styles.lista}>
                  {datos.ventasRecientes.map((venta) => (
                    <li className={styles.fila} key={venta.id}>
                      <span>
                        {venta.fechaVenta} · {venta.referencia} · {venta.talla}
                      </span>
                      <span>{formatearCantidad(venta.cantidad)} unidades</span>
                      <strong>{formatearPesos(venta.total)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
