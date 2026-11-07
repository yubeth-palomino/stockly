'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { hoyBogota } from '@/lib/reglas/fechas';
import { normalizarReferencia, normalizarTalla } from '@/lib/reglas/producto';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { validarPrecioCompra } from '@/lib/reglas/economia';
import type { Rol } from '@/lib/reglas/roles';
import { esquemaEntradaProducto } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

const esquemaProductoEncontrado = z.array(
  z.object({
    id: z.string().uuid(),
    referencia: z.string(),
    talla: z.string(),
    cantidad: z.number().int(),
  }),
);
const esquemaResultadoEntrada = z.object({
  productoId: z.string().uuid(),
  sumado: z.boolean(),
  cantidadResultante: z.number().int(),
});

export function FormularioProducto({ rol }: { rol: Rol }) {
  const router = useRouter();
  const fechaHoy = hoyBogota();
  const [referencia, setReferencia] = useState('');
  const [marca, setMarca] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [talla, setTalla] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [fechaEntrada, setFechaEntrada] = useState(fechaHoy);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [cargandoExistencia, setCargandoExistencia] = useState(false);
  const [errorExistencia, setErrorExistencia] = useState('');
  const [productoExistente, setProductoExistente] = useState<{
    id: string;
    cantidad: number;
  } | null>(null);
  const [resultado, setResultado] = useState<
    (z.infer<typeof esquemaResultadoEntrada> & { cantidadSolicitada: number }) | null
  >(null);

  useEffect(() => {
    if (!referencia.trim() || !talla.trim()) return;

    const controlador = new AbortController();
    const temporizador = window.setTimeout(async () => {
      setCargandoExistencia(true);
      setErrorExistencia('');
      const parametros = new URLSearchParams({ referencia, talla });
      try {
        const response = await fetch(`/api/panel/productos?${parametros}`, {
          signal: controlador.signal,
        });
        const productos = await leerRespuestaApi(response, esquemaProductoEncontrado);
        const existente = productos.find(
          (producto) =>
            normalizarReferencia(producto.referencia) === normalizarReferencia(referencia) &&
            normalizarTalla(producto.talla) === normalizarTalla(talla),
        );
        setProductoExistente(
          existente ? { id: existente.id, cantidad: existente.cantidad } : null,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setProductoExistente(null);
        setErrorExistencia(
          error instanceof Error ? error.message : 'No se pudo consultar el inventario.',
        );
      } finally {
        if (!controlador.signal.aborted) setCargandoExistencia(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [referencia, talla]);

  function validarCampo(campo: string, valor: string | number) {
    const borrador = {
      referencia,
      marca,
      descripcion,
      talla,
      cantidad: Number(cantidad),
      precioVenta: Number(precioVenta),
      fechaEntrada,
      [campo]: valor,
    };
    const validacion = esquemaEntradaProducto.safeParse(borrador);
    let errorCampo = validacion.success
      ? undefined
      : validacion.error.issues.find((issue) => issue.path[0] === campo)?.message;
    if (campo === 'fechaEntrada' && typeof valor === 'string' && valor > fechaHoy) {
      errorCampo = 'La fecha de entrada no puede ser posterior a hoy.';
    }
    setErrores((actuales) => {
      const siguientes = { ...actuales };
      if (errorCampo) siguientes[campo] = errorCampo;
      else delete siguientes[campo];
      return siguientes;
    });
  }

  function validarPrecios(precioCompraTexto: string, precioVentaTexto: string) {
    if (!precioCompraTexto.trim()) {
      setErrores((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes.precioCompra;
        return siguientes;
      });
      return;
    }

    try {
      const costo = Number(precioCompraTexto);
      const venta = Number(precioVentaTexto);
      if (!Number.isInteger(costo) || costo < 1) {
        setErrores((actuales) => ({
          ...actuales,
          precioCompra: 'El precio de compra debe ser un entero mayor que cero.',
        }));
        return;
      }
      if (!Number.isInteger(venta) || venta < 1) return;
      validarPrecioCompra(costo, venta);
      setErrores((actuales) => {
        const siguientes = { ...actuales };
        delete siguientes.precioCompra;
        return siguientes;
      });
    } catch (error) {
      const mensaje =
        error instanceof ErrorDeNegocio
          ? error.message
          : 'El precio de compra no es válido.';
      setErrores((actuales) => ({ ...actuales, precioCompra: mensaje }));
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrores({});
    setResultado(null);
    const datos = {
      referencia,
      marca,
      descripcion,
      talla,
      cantidad: Number(cantidad),
      precioVenta: Number(precioVenta),
      fechaEntrada,
      ...(rol === 'dueno' && precioCompra.trim()
        ? { precioCompra: Number(precioCompra) }
        : {}),
    };
    const parsed = esquemaEntradaProducto.safeParse(datos);
    if (!parsed.success) {
      const nuevosErrores: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0];
        if (typeof campo === 'string' && !nuevosErrores[campo]) {
          nuevosErrores[campo] = issue.message;
        }
      }
      setErrores(nuevosErrores);
      return;
    }
    if (parsed.data.precioCompra !== undefined) {
      try {
        validarPrecioCompra(parsed.data.precioCompra, parsed.data.precioVenta);
      } catch (error) {
        setErrores({
          precioCompra:
            error instanceof Error ? error.message : 'El precio de compra no es válido.',
        });
        return;
      }
    }
    if (fechaEntrada > fechaHoy) {
      setErrores({ fechaEntrada: 'La fecha de entrada no puede ser posterior a hoy.' });
      return;
    }

    setCargando(true);
    try {
      const response = await fetch('/api/panel/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const creado = await leerRespuestaApi(response, esquemaResultadoEntrada);
      setResultado({ ...creado, cantidadSolicitada: parsed.data.cantidad });
      router.refresh();
    } catch (error) {
      setErrores({
        general: error instanceof Error ? error.message : 'No se pudo registrar la entrada.',
      });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={styles.formularioContenedor}>
      {productoExistente && (
        <Aviso tipo="info" titulo="Este producto ya existe">
          Esta referencia y talla ya existen en el inventario. La cantidad que registre se sumará
          a las {productoExistente.cantidad} unidades actuales.
        </Aviso>
      )}
      {cargandoExistencia && <p className={styles.textoSuave} role="status">Consultando si el producto ya existe…</p>}
      {errorExistencia && <Aviso tipo="error">{errorExistencia}</Aviso>}
      {resultado && (
        <Aviso tipo="exito" titulo={resultado.sumado ? 'Entrada sumada' : 'Producto creado'}>
          {resultado.sumado
            ? `Se sumaron ${resultado.cantidadSolicitada} unidades; ahora hay ${resultado.cantidadResultante}.`
            : 'El producto se creó en el inventario.'}
          {' '}
          <Link href={`/panel/inventario/${resultado.productoId}`}>Ver producto</Link>
          {' · '}
          <Link href="/panel/inventario">Ir al inventario</Link>
        </Aviso>
      )}
      {errores.general && <Aviso tipo="error">{errores.general}</Aviso>}
      <form className={styles.formularioPanel} onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Referencia"
          value={referencia}
          onChange={(evento) => {
            setReferencia(evento.target.value);
            setProductoExistente(null);
            setErrorExistencia('');
            validarCampo('referencia', evento.target.value);
          }}
          {...(errores.referencia ? { error: errores.referencia } : {})}
          required
        />
        <Campo
          etiqueta="Marca"
          value={marca}
          onChange={(evento) => {
            setMarca(evento.target.value);
            validarCampo('marca', evento.target.value);
          }}
          {...(errores.marca ? { error: errores.marca } : {})}
          required
        />
        <Campo
          etiqueta="Descripción"
          value={descripcion}
          onChange={(evento) => {
            setDescripcion(evento.target.value);
            validarCampo('descripcion', evento.target.value);
          }}
          {...(errores.descripcion ? { error: errores.descripcion } : {})}
          required
        />
        <Campo
          etiqueta="Talla"
          value={talla}
          onChange={(evento) => {
            setTalla(evento.target.value);
            setProductoExistente(null);
            setErrorExistencia('');
            validarCampo('talla', evento.target.value);
          }}
          {...(errores.talla ? { error: errores.talla } : {})}
          required
        />
        <Campo
          etiqueta="Cantidad"
          type="number"
          min="1"
          step="1"
          value={cantidad}
          onChange={(evento) => {
            setCantidad(evento.target.value);
            validarCampo('cantidad', Number(evento.target.value));
          }}
          {...(errores.cantidad ? { error: errores.cantidad } : {})}
          required
        />
        <Campo
          etiqueta="Precio de venta"
          type="number"
          min="1"
          step="1"
          value={precioVenta}
          onChange={(evento) => {
            setPrecioVenta(evento.target.value);
            validarCampo('precioVenta', Number(evento.target.value));
            if (rol === 'dueno') {
              validarPrecios(precioCompra, evento.target.value);
            }
          }}
          {...(errores.precioVenta ? { error: errores.precioVenta } : {})}
          required
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
            {...(errores.precioCompra ? { error: errores.precioCompra } : {})}
          />
        )}
        <Campo
          etiqueta="Fecha de entrada"
          type="date"
          max={fechaHoy}
          value={fechaEntrada}
          onChange={(evento) => {
            setFechaEntrada(evento.target.value);
            validarCampo('fechaEntrada', evento.target.value);
          }}
          {...(errores.fechaEntrada ? { error: errores.fechaEntrada } : {})}
          required
        />
        <Boton type="submit" cargando={cargando}>Registrar entrada</Boton>
      </form>
    </div>
  );
}
