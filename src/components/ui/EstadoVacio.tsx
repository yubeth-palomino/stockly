import type { ReactNode } from 'react';
import styles from './ui.module.css';

export function EstadoVacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className={styles.estadoVacio}>
      <span aria-hidden="true">—</span>
      <h2>{titulo}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
