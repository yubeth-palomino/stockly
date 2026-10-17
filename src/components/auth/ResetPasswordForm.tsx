'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

export function ResetPasswordForm({ hasInvalidLink }: { hasInvalidLink: boolean }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(
    hasInvalidLink
      ? 'El enlace no es válido o venció. Solicita uno nuevo desde el inicio de sesión.'
      : '',
  );
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPassword.length < 12 || newPassword.length > 128) {
      setError('La contraseña debe tener entre 12 y 128 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? 'No se pudo cambiar la contraseña. Solicita un enlace nuevo.');
        return;
      }
      setIsComplete(true);
    } catch {
      setError('No fue posible conectar con el servidor. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.brandPanel} aria-label="Stockly">
        <Link className={styles.brand} href="/" aria-label="Stockly, inicio">
          <span className={styles.brandMark}>S</span>
          <span>stockly</span>
        </Link>
        <div className={styles.brandMessage}>
          <p className={styles.kicker}>SEGURIDAD DE TU CUENTA</p>
          <h1>Una clave nueva.</h1>
          <p>Actualiza tu contraseña y vuelve a tu espacio de trabajo.</p>
        </div>
        <span className={styles.panelIndex}>01 / STOCKLY</span>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand} aria-hidden="true">
          <span className={styles.brandMark}>S</span>
          <span>stockly</span>
        </div>
        <div className={styles.formContent}>
          <p className={styles.formKicker}>RECUPERACIÓN DE CUENTA</p>
          <h2>{isComplete ? 'Contraseña actualizada' : 'Crea una contraseña nueva'}</h2>
          <p className={styles.formIntro}>
            {isComplete
              ? 'Ya puedes iniciar sesión con tu nueva contraseña.'
              : 'Elige una contraseña nueva de al menos 12 caracteres.'}
          </p>
          {isComplete ? (
            <Link className={styles.submitButton} href="/login">
              Ir a iniciar sesión
            </Link>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {!hasInvalidLink && (
                <>
                  <div className={styles.field}>
                    <label htmlFor="new-password">Nueva contraseña</label>
                    <input
                      autoComplete="new-password"
                      autoFocus
                      id="new-password"
                      maxLength={128}
                      minLength={12}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      type="password"
                      value={newPassword}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="confirm-password">Confirmar nueva contraseña</label>
                    <input
                      autoComplete="new-password"
                      id="confirm-password"
                      maxLength={128}
                      minLength={12}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </div>
                  <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                </>
              )}
              {error && (
                <p className={styles.authError} role="alert">
                  {error}
                </p>
              )}
              <Link className={styles.backToLogin} href="/login">
                Volver a iniciar sesión
              </Link>
            </form>
          )}
        </div>
        <p className={styles.formFooter}>
          Stockly <span>·</span> Gestión de inventario
        </p>
      </section>
    </main>
  );
}
