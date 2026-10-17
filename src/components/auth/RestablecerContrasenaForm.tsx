'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

export function RestablecerContrasenaForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  async function guardarContrasena(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    if (!token) {
      setError('El enlace no es válido o ya venció.');
      return;
    }
    if (contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setProcesando(true);
    try {
      const respuesta = await fetch('/api/auth/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, contrasena, confirmacion }),
      });
      const resultado = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        setError(resultado.error ?? 'No se pudo actualizar la contraseña.');
        return;
      }
      router.replace('/login?restablecida=1');
    } catch {
      setError('No fue posible conectar con el servidor. Intenta nuevamente.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.brandPanel} aria-label="Stockly">
        <Link className={styles.brand} href="/" aria-label="Stockly, inicio">
          <span className={styles.brandMark}>S</span><span>stockly</span>
        </Link>
        <div className={styles.brandMessage}>
          <p className={styles.kicker}>SEGURIDAD DE TU CUENTA</p>
          <h1>Una clave nueva.</h1>
          <p>Elige una contraseña nueva para volver a tu espacio de trabajo.</p>
        </div>
        <span className={styles.panelIndex}>01 / STOCKLY</span>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.formContent}>
          <p className={styles.formKicker}>RECUPERACIÓN DE CUENTA</p>
          <h2>Crea una contraseña nueva</h2>
          <p className={styles.formIntro}>El enlace es válido durante 30 minutos y solo se puede usar una vez.</p>
          {!token ? (
            <div className={styles.form}>
              <p className={styles.authError} role="alert">El enlace no es válido o ya venció.</p>
              <Link className={styles.backToLogin} href="/recuperar-contrasena">Solicitar otro enlace</Link>
            </div>
          ) : (
            <form className={styles.form} onSubmit={guardarContrasena}>
              <div className={styles.field}>
                <label htmlFor="nueva-contrasena">Nueva contraseña</label>
                <input autoComplete="new-password" id="nueva-contrasena" minLength={8} onChange={(evento) => setContrasena(evento.target.value)} required type="password" value={contrasena} />
              </div>
              <div className={styles.field}>
                <label htmlFor="confirmacion-contrasena">Confirmar contraseña</label>
                <input autoComplete="new-password" id="confirmacion-contrasena" minLength={8} onChange={(evento) => setConfirmacion(evento.target.value)} required type="password" value={confirmacion} />
              </div>
              {error && <p className={styles.authError} role="alert">{error}</p>}
              <button className={styles.submitButton} type="submit" disabled={procesando}>
                {procesando ? 'Guardando…' : 'Guardar contraseña'}
              </button>
              <Link className={styles.backToLogin} href="/login">Volver a iniciar sesión</Link>
            </form>
          )}
        </div>
        <p className={styles.formFooter}>Stockly <span>·</span> Gestión de inventario</p>
      </section>
    </main>
  );
}