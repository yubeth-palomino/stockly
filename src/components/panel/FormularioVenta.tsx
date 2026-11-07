'use client';

import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { BuscadorProducto, type ProductoSeleccionado } from '@/components/panel/BuscadorProducto';
import { leerRespuestaApi, ErrorRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos } from '@/lib/formato';
import { esquemaVenta } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

const esquemaResultadoVenta = z.object({
  venta: z.object({ id: z.number().int() }),
  cantidadResultante: z.number().int(),
  agotado: z.boolean(),
});

export function FormularioVenta() {
  const [producto, setProducto] = useState<ProductoSeleccionado | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState('');
  const [agotado, setAgotado] = useState(false);
  const [reintentos, setReintentos] = useState(0);

  const unidades = Number(cantidad);
  const cantidadValida = Number.isInteger(unidades) && unidades > 0;
  const total = producto ? producto.precioVenta * unidades : 0;
  const cantidadExcedeStock = Boolean(producto && cantidadValida && unidades > producto.cantidad);
  const errorCantidad =
    cantidad !== '' && !cantidadValida
      ? 'La cantidad debe ser un entero mayor que cero.'
      : cantidadExcedeStock
        ? `Solo hay ${producto?.cantidad ?? 0} unidades disponibles.`
        : undefined;

  function abrirConfirmacion() {
    if (!producto || !cantidadValida || cantidadExcedeStock || producto.cantidad === 0) {
      setError('Seleccione un producto disponible e indique una cantidad válida.');
      return;
    }
    setError('');
    setModalAbierto(true);
  }

  async function confirmarVenta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!producto || !cantidadValida || cantidadExcedeStock) return;
    setCargando(true);
    setError('');
    setResultado('');
    try {
      const datos = esquemaVenta.parse({
        referencia: producto.referencia,
        talla: producto.talla,
        cantidad: unidades,
      });
      const response = await fetch('/api/panel/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const venta = await leerRespuestaApi(response, esquemaResultadoVenta);
      setResultado(
        venta.agotado
          ? 'Venta registrada. El producto quedó agotado.'
          : `Venta registrada. Quedan ${venta.cantidadResultante} unidades disponibles.`,
      );
      setAgotado(venta.agotado);
      setProducto({ ...producto, cantidad: venta.cantidadResultante });
      setModalAbierto(false);
      setCantidad('');
    } catch (errorCapturado) {
      if (
        errorCapturado instanceof ErrorRespuestaApi &&
        errorCapturado.codigo === 'STOCK_INSUFICIENTE'
      ) {
        setError('Otra venta modificó el inventario. Se actualizará la disponibilidad.');
        setProducto(null);
        setReintentos((actual) => actual + 1);
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
      {resultado && <Aviso tipo="exito" titulo={agotado ? 'Producto agotado' : 'Venta registrada'}>{resultado}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <BuscadorProducto
        producto={producto}
        alSeleccionar={setProducto}
        reintentos={reintentos}
      />
      <Campo
        etiqueta="Cantidad"
        type="number"
        min="1"
        step="1"
        value={cantidad}
        onChange={(evento) => setCantidad(evento.target.value)}
        {...(errorCantidad ? { error: errorCantidad } : {})}
      />
      {producto && cantidadValida && !cantidadExcedeStock && (
        <section className={styles.resumenVenta} aria-label="Resumen de la venta">
          <h2>Resumen</h2>
          <p>{producto.referencia} · Talla {producto.talla}</p>
          <p>Precio de venta: {formatearPesos(producto.precioVenta)}</p>
          <p>Cantidad: {unidades}</p>
          <strong>Total: {formatearPesos(total)}</strong>
        </section>
      )}
      <Boton
        type="button"
        onClick={abrirConfirmacion}
        disabled={!producto || !cantidadValida || cantidadExcedeStock || producto.cantidad === 0}
      >
        Registrar venta
      </Boton>
      <Modal
        abierto={modalAbierto}
        titulo="Confirmar venta"
        onCerrar={() => setModalAbierto(false)}
      >
        <p>
          Va a registrar la venta de {unidades} unidad(es) de {producto?.referencia} talla{' '}
          {producto?.talla}. Quedarán {(producto?.cantidad ?? 0) - unidades} unidades.
        </p>
        <form className={styles.accionesProducto} onSubmit={confirmarVenta}>
          <Boton type="submit" cargando={cargando}>Confirmar venta</Boton>
          <Boton type="button" variante="secundario" onClick={() => setModalAbierto(false)}>
            Cancelar
          </Boton>
        </form>
      </Modal>
    </div>
  );
}
