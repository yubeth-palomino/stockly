'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

export function RecuperarContrasenaForm() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  async function solicitarEnlace(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError('');
    setMensaje('');
    setProcesando(true);

    try {
      const respuesta = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const resultado = (await respuesta.json()) as { message?: string; error?: string };
      if (!respuesta.ok) {
        setError(resultado.error ?? 'No se pudo procesar la solicitud.');
        return;
      }
      setMensaje(resultado.message ?? 'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.');
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
          <h1>Vuelve a tener acceso.</h1>
          <p>Te enviaremos un enlace seguro para crear una contraseña nueva.</p>
        </div>
        <span className={styles.panelIndex}>01 / STOCKLY</span>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.formContent}>
          <p className={styles.formKicker}>RECUPERACIÓN DE CUENTA</p>
          <h2>Restablece tu contraseña</h2>
          <p className={styles.formIntro}>Escribe el correo asociado a tu cuenta de Stockly.</p>
          <form className={styles.form} onSubmit={solicitarEnlace}>
            <div className={styles.field}>
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input
                autoComplete="email"
                id="recovery-email"
                name="email"
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder="nombre@empresa.com"
                required
                type="email"
                value={email}
              />
            </div>
            {error && <p className={styles.authError} role="alert">{error}</p>}
            {mensaje && <p className={styles.recoveryMessage} role="status">{mensaje}</p>}
            <button className={styles.submitButton} type="submit" disabled={procesando}>
              {procesando ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <Link className={styles.backToLogin} href="/login">Volver a iniciar sesión</Link>
          </form>
        </div>
        <p className={styles.formFooter}>Stockly <span>·</span> Gestión de inventario</p>
      </section>
    </main>
  );
}