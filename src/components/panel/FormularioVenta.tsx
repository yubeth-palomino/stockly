'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { Selector } from '@/components/ui/Selector';
import { BuscadorProducto, type ProductoSeleccionado } from '@/components/panel/BuscadorProducto';
import { leerRespuestaApi, ErrorRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos } from '@/lib/formato';
import { totalLineaVenta } from '@/lib/reglas/venta';
import type { Rol } from '@/lib/reglas/roles';
import { esquemaVenta } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

const esquemaResultadoVenta = z.object({
  venta: z.object({ id: z.number().int() }),
  cantidadResultante: z.number().int(),
  agotado: z.boolean(),
  total: z.number().int(),
  totalPagado: z.number().int(),
  saldoPendiente: z.number().int(),
  repetida: z.boolean(),
});
const esquemaClientes = z.array(
  z.object({ id: z.string().uuid(), nombre: z.string(), activo: z.boolean() }),
);
type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'OTRO';

export function FormularioVenta({ rol }: { rol: Rol }) {
  const [producto, setProducto] = useState<ProductoSeleccionado | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [tipoPago, setTipoPago] = useState<'PAGADA' | 'CREDITO'>('PAGADA');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
  const [importeRecibido, setImporteRecibido] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [clientes, setClientes] = useState<z.infer<typeof esquemaClientes>>([]);
  const [errorClientes, setErrorClientes] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState('');
  const [agotado, setAgotado] = useState(false);
  const [reintentos, setReintentos] = useState(0);
  const claveIdempotencia = useRef<string | null>(null);

  const alSeleccionar = useCallback((seleccionado: ProductoSeleccionado | null) => {
    claveIdempotencia.current = null;
    setProducto(seleccionado);
  }, []);
  const alEscanear = useCallback((productoEscaneado: ProductoSeleccionado | null) => {
    claveIdempotencia.current = null;
    setProducto(productoEscaneado);
    setCantidad(productoEscaneado ? '1' : '');
  }, []);

  useEffect(() => {
    if (rol !== 'dueno') return;
    const controlador = new AbortController();
    void fetch('/api/panel/clientes', { signal: controlador.signal })
      .then((response) => leerRespuestaApi(response, esquemaClientes))
      .then(setClientes)
      .catch((errorCapturado: unknown) => {
        if (errorCapturado instanceof DOMException && errorCapturado.name === 'AbortError') return;
        setErrorClientes(
          errorCapturado instanceof Error
            ? errorCapturado.message
            : 'No se pudieron cargar los clientes.',
        );
      });
    return () => controlador.abort();
  }, [rol]);

  const unidades = Number(cantidad);
  const cantidadValida = Number.isSafeInteger(unidades) && unidades > 0;
  const total = producto && cantidadValida ? totalLineaVenta(producto.precioVenta, unidades) : 0n;
  const importeSeguro = total <= BigInt(Number.MAX_SAFE_INTEGER);
  const montoRecibido = tipoPago === 'PAGADA' ? Number(total) : Number(importeRecibido || '0');
  const montoValido =
    Number.isSafeInteger(montoRecibido) &&
    montoRecibido >= 0 &&
    montoRecibido <= Number(total) &&
    (tipoPago === 'CREDITO' ? Boolean(clienteId) : montoRecibido === Number(total));
  const cantidadExcedeStock = Boolean(producto && cantidadValida && unidades > producto.cantidad);
  const errorCantidad =
    cantidad !== '' && !cantidadValida
      ? 'La cantidad debe ser un entero mayor que cero.'
      : cantidadExcedeStock
        ? `Solo hay ${producto?.cantidad ?? 0} unidades disponibles.`
        : undefined;

  function invalidarClave() {
    claveIdempotencia.current = null;
  }

  function abrirConfirmacion() {
    if (
      !producto ||
      !cantidadValida ||
      cantidadExcedeStock ||
      producto.cantidad === 0 ||
      !importeSeguro ||
      !montoValido
    ) {
      setError('Verifique el producto, la cantidad y los datos del pago.');
      return;
    }
    setError('');
    setModalAbierto(true);
  }

  async function confirmarVenta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!producto || !cantidadValida || cantidadExcedeStock || !montoValido) return;
    setCargando(true);
    setError('');
    setResultado('');
    try {
      const datos = esquemaVenta.parse({
        referencia: producto.referencia,
        talla: producto.talla,
        cantidad: unidades,
        tipoPago,
        pagos: montoRecibido > 0 ? [{ metodo: metodoPago, monto: montoRecibido }] : [],
        ...(clienteId ? { clienteId } : {}),
        ...(tipoPago === 'CREDITO' && fechaVencimiento ? { fechaVencimiento } : {}),
        claveIdempotencia: claveIdempotencia.current ?? crypto.randomUUID(),
      });
      claveIdempotencia.current = datos.claveIdempotencia;
      const response = await fetch('/api/panel/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const venta = await leerRespuestaApi(response, esquemaResultadoVenta);
      claveIdempotencia.current = null;
      setResultado(
        `${venta.repetida ? 'La venta ya se había registrado.' : 'Venta registrada.'} ` +
          `${venta.agotado ? 'El producto quedó agotado.' : `Quedan ${venta.cantidadResultante} unidades.`} ` +
          `${venta.saldoPendiente > 0 ? `Saldo pendiente: ${formatearPesos(venta.saldoPendiente)}.` : 'Pago completo.'}`,
      );
      setAgotado(venta.agotado);
      setProducto({ ...producto, cantidad: venta.cantidadResultante });
      setModalAbierto(false);
      setCantidad('');
      setImporteRecibido('');
      setClienteId('');
      setTipoPago('PAGADA');
    } catch (errorCapturado) {
      if (
        errorCapturado instanceof ErrorRespuestaApi &&
        errorCapturado.codigo === 'STOCK_INSUFICIENTE'
      ) {
        setError('Otra venta modificó el inventario. Se actualizará la disponibilidad.');
        setProducto(null);
        setReintentos((actual) => actual + 1);
        invalidarClave();
      } else {
        setError(
          errorCapturado instanceof Error
            ? errorCapturado.message
            : 'No se pudo registrar la venta.',
        );
      }
      setModalAbierto(false);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.formularioContenedor}>
      {resultado && (
        <Aviso tipo="exito" titulo={agotado ? 'Producto agotado' : 'Venta registrada'}>
          {resultado}
        </Aviso>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <BuscadorProducto
        producto={producto}
        alSeleccionar={alSeleccionar}
        reintentos={reintentos}
        alEscanear={alEscanear}
      />
      <Campo
        etiqueta="Cantidad"
        type="number"
        min="1"
        step="1"
        value={cantidad}
        onChange={(evento) => {
          invalidarClave();
          setCantidad(evento.target.value);
        }}
        {...(errorCantidad ? { error: errorCantidad } : {})}
      />
      {producto && cantidadValida && !cantidadExcedeStock && (
        <section className={styles.resumenVenta} aria-label="Resumen de la venta">
          <h2>Resumen</h2>
          <p>
            {producto.referencia} · Talla {producto.talla}
          </p>
          <p>Precio de venta: {formatearPesos(producto.precioVenta)}</p>
          <p>Cantidad: {unidades}</p>
          <strong>Total vendido: {formatearPesos(total)}</strong>
        </section>
      )}
      {!importeSeguro && producto && cantidadValida && (
        <Aviso tipo="error">El total supera el rango seguro permitido para una operación.</Aviso>
      )}
      <Selector
        etiqueta="Tipo de venta"
        value={tipoPago}
        onChange={(evento) => {
          const tipo = evento.target.value === 'CREDITO' && rol === 'dueno' ? 'CREDITO' : 'PAGADA';
          invalidarClave();
          setTipoPago(tipo);
          if (tipo === 'PAGADA') setFechaVencimiento('');
        }}
      >
        <option value="PAGADA">Pagada</option>
        {rol === 'dueno' && <option value="CREDITO">A crédito</option>}
      </Selector>
      {rol === 'dueno' && (
        <>
          {errorClientes && <Aviso tipo="error">{errorClientes}</Aviso>}
          <Selector
            etiqueta={tipoPago === 'CREDITO' ? 'Cliente' : 'Cliente (opcional)'}
            value={clienteId}
            onChange={(evento) => {
              invalidarClave();
              setClienteId(evento.target.value);
            }}
          >
            <option value="">Selecciona un cliente</option>
            {clientes
              .filter((cliente) => cliente.activo)
              .map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
          </Selector>
          {tipoPago === 'CREDITO' && (
            <>
              <Campo
                etiqueta="Fecha de vencimiento (opcional)"
                type="date"
                value={fechaVencimiento}
                onChange={(evento) => {
                  invalidarClave();
                  setFechaVencimiento(evento.target.value);
                }}
              />
              <Campo
                etiqueta="Abono inicial (opcional)"
                type="number"
                min="0"
                step="1"
                value={importeRecibido}
                onChange={(evento) => {
                  invalidarClave();
                  setImporteRecibido(evento.target.value);
                }}
                ayuda={
                  producto && cantidadValida && montoRecibido <= Number(total)
                    ? `Saldo pendiente: ${formatearPesos(total - BigInt(montoRecibido))}`
                    : 'Ingrese un valor no negativo que no supere el total.'
                }
              />
            </>
          )}
        </>
      )}
      <Selector
        etiqueta="Método de pago recibido"
        value={metodoPago}
        onChange={(evento) => {
          invalidarClave();
          setMetodoPago(evento.target.value as MetodoPago);
        }}
      >
        <option value="EFECTIVO">Efectivo</option>
        <option value="TRANSFERENCIA">Transferencia</option>
        <option value="TARJETA">Tarjeta</option>
        <option value="OTRO">Otro</option>
      </Selector>
      <Boton
        type="button"
        onClick={abrirConfirmacion}
        disabled={
          !producto ||
          !cantidadValida ||
          cantidadExcedeStock ||
          producto.cantidad === 0 ||
          !importeSeguro ||
          !montoValido
        }
      >
        Registrar venta
      </Boton>
      <Modal
        abierto={modalAbierto}
        titulo="Confirmar venta"
        onCerrar={() => setModalAbierto(false)}
      >
        <p>
          Va a registrar {unidades} unidad(es) de {producto?.referencia} talla {producto?.talla}.
          Quedarán {(producto?.cantidad ?? 0) - unidades} unidades.
          {tipoPago === 'CREDITO'
            ? ` Se recibirá ${formatearPesos(montoRecibido)} y quedará pendiente ${formatearPesos(total - BigInt(montoRecibido))}.`
            : ` Se recibirá el total de ${formatearPesos(total)}.`}
        </p>
        <form className={styles.accionesProducto} onSubmit={confirmarVenta}>
          <Boton type="submit" cargando={cargando}>
            Confirmar venta
          </Boton>
          <Boton type="button" variante="secundario" onClick={() => setModalAbierto(false)}>
            Cancelar
          </Boton>
        </form>
      </Modal>
    </div>
  );
}
