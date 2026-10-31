import type { ReactNode } from 'react';
import styles from './ui.module.css';

export type TonoInsignia = 'neutro' | 'primario' | 'disponible' | 'agotado' | 'inactivo' | 'dueno';

export function Insignia({
  tono = 'neutro',
  children,
}: {
  tono?: TonoInsignia;
  children: ReactNode;
}) {
  return <span className={`${styles.insignia} ${styles[`insignia_${tono}`]}`}>{children}</span>;
}
