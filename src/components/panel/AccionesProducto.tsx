'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { esquemaCambiosProducto } from '@/lib/validacion/esquemas';
import type { Rol } from '@/lib/reglas/roles';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { validarPrecioCompra } from '@/lib/reglas/economia';
import styles from './panel.module.css';
import { z } from 'zod';

export function AccionesProducto({
  id,
  rol,
  cantidad,
  marcaInicial,
  descripcionInicial,
  precioVentaInicial,
  precioCompraInicial,
}: {
  id: string;
  rol: Rol;
  cantidad: number;
  marcaInicial: string;
  descripcionInicial: string;
  precioVentaInicial: number;
  precioCompraInicial: number | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [marca, setMarca] = useState(marcaInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial);
  const [precioVenta, setPrecioVenta] = useState(String(precioVentaInicial));
  const [precioCompra, setPrecioCompra] = useState(
    precioCompraInicial === null ? '' : String(precioCompraInicial),
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    const parsed = esquemaCambiosProducto.safeParse({
      marca,
      descripcion,
      precioVenta: Number(precioVenta),
      ...(rol === 'dueno' && precioCompra.trim()
        ? { precioCompra: Number(precioCompra) }
        : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise los datos ingresados.');
      return;
    }
    const precioCompraValidar =
      parsed.data.precioCompra ?? (rol === 'dueno' ? precioCompraInicial : null);
    if (precioCompraValidar !== null && precioCompraValidar !== undefined) {
      try {
        validarPrecioCompra(precioCompraValidar, parsed.data.precioVenta ?? precioVentaInicial);
      } catch (errorCapturado) {
        setError(
          errorCapturado instanceof Error
            ? errorCapturado.message
            : 'Revise la relación entre los precios.',
        );
        return;
      }
    }

    setCargando(true);
    try {
      const response = await fetch(`/api/panel/productos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      await leerRespuestaApi(response, z.object({ actualizado: z.literal(true) }));
      setAbierto(false);
      setAviso('Los datos del producto se actualizaron.');
      router.refresh();
    } catch (errorCapturado) {
      setError(errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo actualizar el producto.');
    } finally {
      setCargando(false);
    }
  }

  function validarPrecios(costoTexto: string, ventaTexto: string) {
    if (!costoTexto.trim()) return;
    const costo = Number(costoTexto);
    const venta = Number(ventaTexto);
    if (!Number.isInteger(costo) || costo < 1 || !Number.isInteger(venta) || venta < 1) {
      setError('Los precios deben ser enteros mayores que cero.');
      return;
    }
    try {
      validarPrecioCompra(costo, venta);
      setError('');
    } catch (errorCapturado) {
      setError(
        errorCapturado instanceof ErrorDeNegocio
          ? errorCapturado.message
          : 'Revise la relación entre los precios.',
      );
    }
  }

  async function desactivar() {
    if (!window.confirm('¿Desea desactivar este producto agotado?')) return;
    setCargando(true);
    setError('');
    try {
      const response = await fetch(`/api/panel/productos/${id}/desactivar`, { method: 'POST' });
      await leerRespuestaApi(response, z.object({ desactivado: z.literal(true) }));
      setAviso('El producto se desactivó.');
      router.refresh();
    } catch (errorCapturado) {
      setError(errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo desactivar el producto.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.accionesProducto}>
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="button" variante="secundario" onClick={() => setAbierto(true)}>
        Editar
      </Boton>
      {rol === 'dueno' && cantidad === 0 && (
        <Boton type="button" variante="peligro" onClick={desactivar} cargando={cargando}>
          Desactivar
        </Boton>
      )}
      <Modal abierto={abierto} titulo="Editar producto" onCerrar={() => setAbierto(false)}>
        <form className={styles.formularioPanel} onSubmit={guardar}>
          <Campo etiqueta="Marca" value={marca} onChange={(evento) => setMarca(evento.target.value)} />
          <Campo etiqueta="Descripción" value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} />
          <Campo
            etiqueta="Precio de venta"
            type="number"
            min="1"
            step="1"
            value={precioVenta}
            onChange={(evento) => {
              setPrecioVenta(evento.target.value);
              if (rol === 'dueno') validarPrecios(precioCompra || String(precioCompraInicial ?? ''), evento.target.value);
            }}
          />
          {rol === 'dueno' && (
            <Campo
              etiqueta="Precio de compra (opcional)"
              type="number"
              min="1"
              step="1"
              value={precioCompra}
              onChange={(evento) => {
                setPrecioCompra(evento.target.value);
                validarPrecios(evento.target.value, precioVenta);
              }}
            />
          )}
          {error && <p className={styles.errorFormulario} role="alert">{error}</p>}
          <Boton type="submit" cargando={cargando}>Guardar cambios</Boton>
        </form>
      </Modal>
    </div>
  );
}
