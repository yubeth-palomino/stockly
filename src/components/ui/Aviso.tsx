'use client';

import { useState, type ReactNode } from 'react';
import styles from './ui.module.css';

export type TipoAviso = 'info' | 'exito' | 'advertencia' | 'error';

export function Aviso({
  tipo = 'info',
  titulo,
  children,
  cerrable = false,
}: {
  tipo?: TipoAviso;
  titulo?: string;
  children: ReactNode;
  cerrable?: boolean;
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <aside className={`${styles.aviso} ${styles[`aviso_${tipo}`]}`} role="status">
      <div>
        {titulo && <strong>{titulo}</strong>}
        <div>{children}</div>
      </div>
      {cerrable && (
        <button
          className={styles.cerrarAviso}
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => setVisible(false)}
        >
          ×
        </button>
      )}
    </aside>
  );
}
