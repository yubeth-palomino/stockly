'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './LogoutButton.module.css';

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
      router.replace('/login');
      router.refresh();
    } catch {
      setError('No se pudo cerrar la sesión. Intenta de nuevo.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button className={styles.button} type="button" onClick={handleLogout} disabled={isSubmitting}>
        <span className={styles.icon} aria-hidden="true">↪</span>
        <span className={styles.label}>{isSubmitting ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
      </button>
      {error && <span className={styles.error} role="status">{error}</span>}
    </div>
  );
}