import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma';

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  cargando?: boolean;
  children: ReactNode;
};

export function Boton({
  variante = 'primario',
  cargando = false,
  disabled,
  children,
  ...props
}: BotonProps) {
  return (
    <button
      {...props}
      className={`${styles.boton} ${styles[`boton_${variante}`]} ${props.className ?? ''}`}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
    >
      {cargando ? 'Procesando…' : children}
    </button>
  );
}
