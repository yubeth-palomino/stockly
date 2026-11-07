'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './panel.module.css';

type CodigoDetectado = { rawValue: string };
type DetectorCodigo = {
  detect: (video: HTMLVideoElement) => Promise<CodigoDetectado[]>;
};
type VentanaConDetector = Window & {
  BarcodeDetector?: new (opciones: { formats: string[] }) => DetectorCodigo;
};

export function EscanerCamara({ alLeer }: { alLeer: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState('');

  function detener() {
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
    setActivo(false);
  }

  useEffect(() => detener, []);

  async function iniciar() {
    setError('');
    const Constructor = (window as VentanaConDetector).BarcodeDetector;
    if (!Constructor) {
      setError('Este navegador no permite escaneo por cámara. Usa el lector o escribe el código.');
      return;
    }

    try {
      const camara = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      flujo.current = camara;
      if (!video.current) {
        detener();
        return;
      }
      video.current.srcObject = camara;
      await video.current.play();
      const detector = new Constructor({ formats: ['ean_13'] });
      setActivo(true);

      while (flujo.current === camara) {
        const codigos = await detector.detect(video.current);
        const codigo = codigos[0]?.rawValue;
        if (codigo) {
          alLeer(codigo);
          detener();
          break;
        }
        await new Promise((resolver) => window.setTimeout(resolver, 160));
      }
    } catch {
      detener();
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
      {activo && (
        <video
          className={styles.videoEscaner}
          ref={video}
          muted
          playsInline
          aria-label="Vista de la cámara para escanear"
        />
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
