import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

export function Tarjeta({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section {...props} className={`${styles.tarjeta} ${className}`}>
      {children}
    </section>
  );
}
