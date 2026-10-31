'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Boton } from './Boton';
import styles from './ui.module.css';

export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const elementoAnterior = document.activeElement;
    dialogo.current?.focus();
    const manejarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', manejarEscape);
    return () => {
      document.removeEventListener('keydown', manejarEscape);
      if (elementoAnterior instanceof HTMLElement) elementoAnterior.focus();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className={styles.fondoModal}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        ref={dialogo}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
      >
        <header className={styles.encabezadoModal}>
          <h2 id="modal-titulo">{titulo}</h2>
          <Boton variante="fantasma" aria-label="Cerrar ventana" onClick={onCerrar}>
            ×
          </Boton>
        </header>
        {children}
      </div>
    </div>
  );
}
