import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import styles from './ui.module.css';

type SelectorProps = SelectHTMLAttributes<HTMLSelectElement> & {
  etiqueta: string;
  children: ReactNode;
  error?: string;
};

export function Selector({ etiqueta, children, error, ...props }: SelectorProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={styles.campo}>
      <label htmlFor={id}>{etiqueta}</label>
      <select {...props} id={id} aria-invalid={error ? true : undefined} aria-describedby={errorId}>
        {children}
      </select>
      {error && (
        <small className={styles.errorTexto} id={errorId}>
          {error}
        </small>
      )}
    </div>
  );
}
