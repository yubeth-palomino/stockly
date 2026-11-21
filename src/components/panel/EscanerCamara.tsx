'use client';

import { useEffect, useRef, useState } from 'react';
import { type IScannerControls } from '@zxing/browser';
import styles from './panel.module.css';

export function EscanerCamara({ alLeer }: { alLeer: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controles = useRef<IScannerControls | null>(null);
  const intentoActual = useRef(0);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState('');

  function detener() {
    intentoActual.current += 1;
    controles.current?.stop();
    controles.current = null;
    setActivo(false);
  }

  useEffect(
    () => () => {
      intentoActual.current += 1;
      controles.current?.stop();
    },
    [],
  );

  async function iniciar() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceso a la cámara. Usa el lector o escribe el código.');
      return;
    }

    const intento = intentoActual.current + 1;
    intentoActual.current = intento;
    setActivo(true);

    try {
      const elementoVideo = video.current;
      if (!elementoVideo) throw new Error('No se pudo preparar la vista de la cámara.');

      const { BarcodeFormat, BrowserMultiFormatReader } = await import('@zxing/browser');
      if (intentoActual.current !== intento) return;

      const lector = new BrowserMultiFormatReader();
      lector.possibleFormats = [BarcodeFormat.EAN_13];
      const nuevosControles = await lector.decodeFromVideoDevice(
        undefined,
        elementoVideo,
        (resultado) => {
          if (!resultado || intentoActual.current !== intento) return;
          alLeer(resultado.getText());
          detener();
        },
      );

      if (intentoActual.current !== intento) nuevosControles.stop();
      else controles.current = nuevosControles;
    } catch {
      if (intentoActual.current !== intento) return;
      intentoActual.current += 1;
      setActivo(false);
      setError('No se pudo acceder a la cámara. Verifica los permisos o usa el lector.');
    }
  }

  return (
    <div>
      <button
        className={styles.botonEscaner}
        type="button"
        onClick={activo ? detener : iniciar}
      >
        {activo ? 'Detener cámara' : 'Escanear con cámara'}
      </button>
      <video
        className={styles.videoEscaner}
        ref={video}
        muted
        playsInline
        aria-label="Vista de la cámara para escanear"
        hidden={!activo}
      />
      {error && (
        <p className={styles.errorEscaner} role="status">
          {error}
        </p>
      )}
    </div>
  );
}
