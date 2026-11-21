'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { leerRespuestaApi } from '@/lib/http/cliente';
import { esquemaUsuario } from '@/lib/validacion/esquemas';
import styles from './panel.module.css';

const esquemaUsuarioCreado = z.object({ id: z.string().uuid() });

export function FormularioUsuario() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [rol, setRol] = useState<'trabajador' | 'dueno'>('trabajador');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  async function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setExito('');
    const parsed = esquemaUsuario.safeParse({ nombre, usuario, rol, correo });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise los datos ingresados.');
      return;
    }

    setCargando(true);
    try {
      const response = await fetch('/api/panel/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      await leerRespuestaApi(response, esquemaUsuarioCreado);
      setNombre('');
      setUsuario('');
      setRol('trabajador');
      setCorreo('');
      setExito('Invitación enviada. La persona podrá activar su cuenta y crear una contraseña.');
      router.refresh();
    } catch (errorCapturado) {
      setError(
        errorCapturado instanceof Error ? errorCapturado.message : 'No se pudo crear el usuario.',
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className={styles.formularioUsuario}>
      <h2>Dar de alta una cuenta</h2>
      <p className={styles.textoSuave}>
        Envía una invitación segura para que la persona active su cuenta y establezca su contraseña.
      </p>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {exito && <Aviso tipo="exito">{exito}</Aviso>}
      <form className={styles.formularioPanel} onSubmit={crear} noValidate>
        <Campo etiqueta="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
        <Campo
          etiqueta="Usuario"
          value={usuario}
          onChange={(evento) => setUsuario(evento.target.value)}
          ayuda="Identificador interno de Stockly. Para iniciar sesión se usa el correo de invitación."
          required
        />
        <Campo
          etiqueta="Correo de inicio de sesión"
          type="email"
          value={correo}
          onChange={(evento) => setCorreo(evento.target.value)}
          autoComplete="email"
          required
        />
        <Selector
          etiqueta="Rol"
          value={rol}
          onChange={(evento) => {
            if (evento.target.value === 'trabajador' || evento.target.value === 'dueno') {
              setRol(evento.target.value);
            }
          }}
        >
          <option value="trabajador">Trabajador</option>
          <option value="dueno">Dueño</option>
        </Selector>
        <Boton type="submit" cargando={cargando}>Enviar invitación</Boton>
      </form>
    </section>
  );
}
