import { useId, type InputHTMLAttributes } from 'react';
import styles from './ui.module.css';

type CampoProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  etiqueta: string;
  ayuda?: string;
  error?: string;
};

export function Campo({ etiqueta, ayuda, error, ...props }: CampoProps) {
  const id = useId();
  const ayudaId = ayuda ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.campo}>
      <label htmlFor={id}>{etiqueta}</label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[ayudaId, errorId].filter(Boolean).join(' ') || undefined}
      />
      {ayuda && <small id={ayudaId}>{ayuda}</small>}
      {error && (
        <small className={styles.errorTexto} id={errorId}>
          {error}
        </small>
      )}
    </div>
  );
}
