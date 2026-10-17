'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import styles from './ChangePasswordButton.module.css';

export function ChangePasswordButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, [isOpen]);

  function closeDialog() {
    dialogRef.current?.close();
    setIsOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPassword.length < 12 || newPassword.length > 128) {
      setError('La nueva contraseña debe tener entre 12 y 128 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? 'No se pudo cambiar la contraseña. Intenta nuevamente.');
        return;
      }
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('No fue posible conectar con el servidor. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className={styles.trigger} type="button" onClick={() => setIsOpen(true)}>
        Cambiar contraseña
      </button>

      {isOpen && (
        <dialog
          aria-labelledby="change-password-title"
          className={styles.dialog}
          onCancel={(event) => {
            event.preventDefault();
            closeDialog();
          }}
          onClose={() => setIsOpen(false)}
          ref={dialogRef}
        >
          <div className={styles.heading}>
            <div>
              <p className={styles.kicker}>SEGURIDAD DE LA CUENTA</p>
              <h2 id="change-password-title">Cambiar contraseña</h2>
            </div>
            <button className={styles.close} type="button" onClick={closeDialog} aria-label="Cerrar">
              ×
            </button>
          </div>

          {success ? (
            <div className={styles.success} role="status">
              <p>Tu contraseña se cambió correctamente.</p>
              <button className={styles.submit} type="button" onClick={closeDialog}>Listo</button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <p className={styles.intro}>Confirma tu contraseña actual y elige una nueva de al menos 12 caracteres.</p>
              <label className={styles.field}>
                <span>Contraseña actual</span>
                <input
                  autoComplete="current-password"
                  autoFocus
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  type="password"
                  value={currentPassword}
                />
              </label>
              <label className={styles.field}>
                <span>Nueva contraseña</span>
                <input
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
              </label>
              <label className={styles.field}>
                <span>Confirmar nueva contraseña</span>
                <input
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </label>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <div className={styles.actions}>
                <button className={styles.cancel} type="button" onClick={closeDialog} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button className={styles.submit} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </>
  );
}
