'use client';

import { useEffect, useRef, useState } from 'react';
import { type IScannerControls } from '@zxing/browser';
import styles from './panel.module.css';

export function EscanerCamara({ alLeer }: { alLeer: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const controles = useRef<IScannerControls | null>(null);
  const flujo = useRef<MediaStream | null>(null);
  const intentoActual = useRef(0);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState('');

  function detener() {
    intentoActual.current += 1;
    controles.current?.stop();
    controles.current = null;
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
    if (video.current) video.current.srcObject = null;
    setActivo(false);
  }

  useEffect(
    () => () => {
      intentoActual.current += 1;
      controles.current?.stop();
      flujo.current?.getTracks().forEach((pista) => pista.stop());
      flujo.current = null;
    },
    [],
  );

  function avisarLectura() {
    try {
      if (navigator.vibrate?.(70)) return;
    } catch (errorVibracion) {
      console.warn('No se pudo vibrar al leer el código:', errorVibracion);
    }

    if (!window.AudioContext) return;
    try {
      const contexto = new AudioContext();
      const oscilador = contexto.createOscillator();
      const volumen = contexto.createGain();
      oscilador.frequency.value = 880;
      volumen.gain.setValueAtTime(0.06, contexto.currentTime);
      volumen.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.08);
      oscilador.connect(volumen);
      volumen.connect(contexto.destination);
      oscilador.start();
      oscilador.stop(contexto.currentTime + 0.08);
      oscilador.onended = () => {
        void contexto.close();
      };
    } catch (errorSonido) {
      console.warn('No se pudo reproducir el aviso de lectura:', errorSonido);
    }
  }

  async function iniciar() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceso a la cámara. Usa el lector o escribe el código.');
      return;
    }
    const elementoVideo = video.current;
    if (!elementoVideo) {
      setError('No se pudo preparar la vista de la cámara.');
      return;
    }

    const intento = intentoActual.current + 1;
    intentoActual.current = intento;
    setActivo(true);

    try {
      const nuevoFlujo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (intentoActual.current !== intento) {
        nuevoFlujo.getTracks().forEach((pista) => pista.stop());
        return;
      }
      flujo.current = nuevoFlujo;
      elementoVideo.srcObject = nuevoFlujo;

      const { BarcodeFormat, BrowserMultiFormatReader } = await import('@zxing/browser');
      if (intentoActual.current !== intento) {
        nuevoFlujo.getTracks().forEach((pista) => pista.stop());
        flujo.current = null;
        return;
      }

      const lector = new BrowserMultiFormatReader();
      lector.possibleFormats = [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ];
      const nuevosControles = await lector.decodeFromStream(
        nuevoFlujo,
        elementoVideo,
        (resultado) => {
          if (!resultado || intentoActual.current !== intento) return;
          const codigo = resultado.getText();
          avisarLectura();
          detener();
          alLeer(codigo);
        },
      );

      if (intentoActual.current !== intento) nuevosControles.stop();
      else controles.current = nuevosControles;
    } catch (errorCamara) {
      if (intentoActual.current !== intento) return;
      intentoActual.current += 1;
      controles.current?.stop();
      controles.current = null;
      flujo.current?.getTracks().forEach((pista) => pista.stop());
      flujo.current = null;
      if (elementoVideo) elementoVideo.srcObject = null;
      setActivo(false);
      setError(
        errorCamara instanceof DOMException &&
          ['NotAllowedError', 'PermissionDeniedError'].includes(errorCamara.name)
          ? 'Permite el acceso a la cámara para escanear.'
          : 'No se pudo acceder a la cámara. Verifica los permisos o usa el lector.',
      );
    }
  }

  return (
    <div>
      <button
        className={styles.botonEscaner}
        type="button"
        onClick={activo ? detener : iniciar}
      >
        {activo ? 'Cerrar cámara' : 'Escanear con cámara'}
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
