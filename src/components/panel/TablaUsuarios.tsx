'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { InsigniaRol } from '@/components/panel/InsigniaRol';
import { leerRespuestaApi } from '@/lib/http/cliente';
import type { FilaUsuario } from '@/lib/datos/tipos';
import type { Rol } from '@/lib/reglas/roles';
import { formatearFecha } from '@/lib/formato';
import { z } from 'zod';
import styles from './panel.module.css';

const esquemaActualizacion = z.object({ actualizado: z.literal(true) });

export function TablaUsuarios({
  usuarios,
  duenoActualId,
  duenosActivos,
}: {
  usuarios: FilaUsuario[];
  duenoActualId: string;
  duenosActivos: number;
}) {
  return (
    <div className={styles.tablaDesbordable}>
      <table className={styles.tablaPanel}>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Usuario</th>
            <th scope="col">Rol</th>
            <th scope="col">Estado</th>
            <th scope="col">Creado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <FilaUsuarioAdmin
              key={usuario.id}
              usuario={usuario}
              duenoActualId={duenoActualId}
              duenosActivos={duenosActivos}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilaUsuarioAdmin({
  usuario,
  duenoActualId,
  duenosActivos,
}: {
  usuario: FilaUsuario;
  duenoActualId: string;
  duenosActivos: number;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [activo, setActivo] = useState(usuario.activo);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const esUltimoDueno = usuario.id === duenoActualId && usuario.rol === 'dueno' &&
    usuario.activo && duenosActivos === 1;
  const hayCambios =
    nombre.trim() !== usuario.nombre || rol !== usuario.rol || activo !== usuario.activo;

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!hayCambios) return;
    setError('');
    setCargando(true);
    const cambios = {
      ...(nombre.trim() !== usuario.nombre ? { nombre: nombre.trim() } : {}),
      ...(rol !== usuario.rol ? { rol } : {}),
      ...(activo !== usuario.activo ? { activo } : {}),
    };
    try {
      const response = await fetch(`/api/panel/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      await leerRespuestaApi(response, esquemaActualizacion);
      router.refresh();
    } catch (errorCapturado) {
      setError(
        errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo actualizar el usuario.',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <tr>
      <td>
        <Campo
          etiqueta={`Nombre de ${usuario.usuario}`}
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </td>
      <td>{usuario.usuario}</td>
      <td>
        <div className={styles.rolUsuario}>
          <InsigniaRol rol={usuario.rol} />
          <Selector
            etiqueta={`Rol de ${usuario.usuario}`}
            value={rol}
            disabled={esUltimoDueno}
            onChange={(evento) => {
              if (evento.target.value === 'trabajador' || evento.target.value === 'dueno') {
                setRol(evento.target.value);
              }
            }}
          >
            <option value="trabajador">Trabajador</option>
            <option value="dueno">Dueño</option>
          </Selector>
        </div>
      </td>
      <td>
        <label className={styles.estadoUsuario}>
          <input
            type="checkbox"
            checked={activo}
            disabled={esUltimoDueno}
            onChange={(evento) => setActivo(evento.target.checked)}
          />
          {activo ? 'Activo' : 'Inactivo'}
        </label>
      </td>
      <td>{formatearFecha(usuario.createdAt.slice(0, 10))}</td>
      <td>
        <form className={styles.accionesUsuario} onSubmit={guardar}>
          <Boton type="submit" variante="secundario" cargando={cargando} disabled={!hayCambios}>
            Guardar
          </Boton>
          {esUltimoDueno && <small>No se puede cambiar el rol o estado del único dueño activo.</small>}
          {error && <Aviso tipo="error">{error}</Aviso>}
        </form>
      </td>
    </tr>
  );
}
