'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { formatearPesos } from '@/lib/formato';
import { esquemaCliente, esquemaProveedor } from '@/lib/validacion/esquemas';
import estilosUi from '@/components/ui/ui.module.css';
import styles from './comercial.module.css';

const esquemaDirectorio = z.array(
  z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    identificacion: z.string().nullable(),
    contacto: z.string().nullable().optional(),
    telefono: z.string().nullable(),
    correo: z.string().nullable(),
    direccion: z.string().nullable(),
    observaciones: z.string().nullable(),
    activo: z.boolean(),
    saldoPendiente: z.number().int().optional(),
  }),
);
type Contacto = z.infer<typeof esquemaDirectorio>[number];

export function DirectorioComercial({ tipo }: { tipo: 'proveedores' | 'clientes' }) {
  const esProveedor = tipo === 'proveedores';
  const base = `/api/panel/${tipo}`;
  const [filas, setFilas] = useState<Contacto[]>([]);
  const [consulta, setConsulta] = useState('');
  const [editando, setEditando] = useState<Contacto | null>(null);
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    setCargandoLista(true);
    try {
      const parametros = new URLSearchParams();
      if (consulta.trim()) parametros.set('q', consulta.trim());
      const response = await fetch(`${base}?${parametros}`, { cache: 'no-store' });
      setFilas(await leerRespuestaApi(response, esquemaDirectorio));
      setError('');
    } catch (capturado) {
      setError(capturado instanceof Error ? capturado.message : 'No se pudo cargar el listado.');
    } finally {
      setCargandoLista(false);
    }
  }, [base, consulta]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), 250);
    return () => window.clearTimeout(temporizador);
  }, [cargar]);

  function iniciarEdicion(fila: Contacto) {
    setEditando(fila);
    setNombre(fila.nombre);
    setIdentificacion(fila.identificacion ?? '');
    setContacto(fila.contacto ?? '');
    setTelefono(fila.telefono ?? '');
    setCorreo(fila.correo ?? '');
    setDireccion(fila.direccion ?? '');
    setObservaciones(fila.observaciones ?? '');
    setError('');
  }

  function limpiarFormulario() {
    setEditando(null);
    setNombre('');
    setIdentificacion('');
    setContacto('');
    setTelefono('');
    setCorreo('');
    setDireccion('');
    setObservaciones('');
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setError('');
    setMensaje('');
    const borrador = {
      nombre,
      ...(identificacion.trim() ? { identificacion: identificacion.trim() } : {}),
      ...(esProveedor && contacto.trim() ? { contacto: contacto.trim() } : {}),
      ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
      ...(correo.trim() ? { correo: correo.trim() } : {}),
      ...(direccion.trim() ? { direccion: direccion.trim() } : {}),
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
    };
    try {
      const esquema = esProveedor ? esquemaProveedor : esquemaCliente;
      esquema.parse(borrador);
      const response = await fetch(editando ? `${base}/${editando.id}` : base, {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(borrador),
      });
      await leerRespuestaApi(response, z.unknown());
      setMensaje(editando ? 'Datos actualizados.' : 'Registro creado.');
      limpiarFormulario();
      await cargar();
    } catch (capturado) {
      setError(capturado instanceof Error ? capturado.message : 'No se pudo guardar el registro.');
    } finally {
      setCargando(false);
    }
  }

  async function cambiarEstado(fila: Contacto) {
    setError('');
    setMensaje('');
    try {
      const response = await fetch(`${base}/${fila.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !fila.activo }),
      });
      await leerRespuestaApi(response, z.unknown());
      setMensaje(fila.activo ? 'Registro desactivado.' : 'Registro activado.');
      await cargar();
    } catch (capturado) {
      setError(capturado instanceof Error ? capturado.message : 'No se pudo cambiar el estado.');
    }
  }

  return (
    <div className={styles.panel}>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      <section className={styles.tarjeta}>
        <h2>
          {editando ? 'Editar registro' : esProveedor ? 'Registrar proveedor' : 'Registrar cliente'}
        </h2>
        <form className={styles.formulario} onSubmit={(evento) => void guardar(evento)}>
          <Campo
            etiqueta="Nombre o razón social"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            maxLength={160}
            required
          />
          <Campo
            etiqueta="Identificación (opcional)"
            value={identificacion}
            onChange={(evento) => setIdentificacion(evento.target.value)}
            maxLength={40}
          />
          {esProveedor && (
            <Campo
              etiqueta="Persona de contacto (opcional)"
              value={contacto}
              onChange={(evento) => setContacto(evento.target.value)}
              maxLength={120}
            />
          )}
          <Campo
            etiqueta="Teléfono (opcional)"
            value={telefono}
            onChange={(evento) => setTelefono(evento.target.value)}
            maxLength={40}
          />
          <Campo
            etiqueta="Correo (opcional)"
            type="email"
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            maxLength={254}
          />
          <Campo
            etiqueta="Dirección (opcional)"
            value={direccion}
            onChange={(evento) => setDireccion(evento.target.value)}
            maxLength={240}
          />
          <Campo
            etiqueta="Observaciones (opcional)"
            value={observaciones}
            onChange={(evento) => setObservaciones(evento.target.value)}
            maxLength={500}
          />
          <div className={styles.anchoCompleto}>
            <Boton type="submit" cargando={cargando}>
              {editando ? 'Guardar cambios' : 'Crear registro'}
            </Boton>
            {editando && (
              <Boton type="button" variante="secundario" onClick={limpiarFormulario}>
                Cancelar
              </Boton>
            )}
          </div>
        </form>
        {esProveedor && (
          <p className={styles.nota}>
            El registro de un proveedor no crea compras ni cuentas por pagar.
          </p>
        )}
      </section>
      <section className={styles.tarjeta}>
        <h2>{esProveedor ? 'Proveedores registrados' : 'Clientes registrados'}</h2>
        <Campo
          etiqueta="Buscar por nombre o identificación"
          value={consulta}
          onChange={(evento) => setConsulta(evento.target.value)}
          maxLength={120}
        />
        {cargandoLista ? (
          <p role="status">Cargando listado…</p>
        ) : filas.length === 0 ? (
          <p>No hay registros para mostrar.</p>
        ) : (
          <div className={styles.tabla}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Identificación</th>
                  <th>Contacto</th>
                  {!esProveedor && <th>Saldo</th>}
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id}>
                    <td>{fila.nombre}</td>
                    <td>{fila.identificacion ?? '—'}</td>
                    <td>
                      {[fila.contacto, fila.telefono, fila.correo].filter(Boolean).join(' · ') ||
                        '—'}
                    </td>
                    {!esProveedor && <td>{formatearPesos(fila.saldoPendiente ?? 0)}</td>}
                    <td>
                      <span className={styles.estado}>{fila.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td>
                      <div className={styles.acciones}>
                        <Boton
                          type="button"
                          variante="secundario"
                          onClick={() => iniciarEdicion(fila)}
                        >
                          Editar
                        </Boton>
                        {esProveedor ? (
                          <Link
                            className={`${estilosUi.boton} ${estilosUi.boton_secundario}`}
                            href={`/panel/proveedores/${fila.id}`}
                          >
                            Detalle
                          </Link>
                        ) : (
                          <Link
                            className={`${estilosUi.boton} ${estilosUi.boton_secundario}`}
                            href={`/panel/clientes/${fila.id}`}
                          >
                            Historial
                          </Link>
                        )}
                        <Boton
                          type="button"
                          variante="fantasma"
                          onClick={() => void cambiarEstado(fila)}
                        >
                          {fila.activo ? 'Desactivar' : 'Activar'}
                        </Boton>
                      </div>
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
