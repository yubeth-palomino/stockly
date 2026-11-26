'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import styles from './CapturaFotoProducto.module.css';

const LADO_MAXIMO_FOTO = 1600;

export function CapturaFotoProducto({
  onFotoChange,
}: {
  onFotoChange: (foto: File | null) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const intentoActual = useRef(0);
  const urlPrevia = useRef<string | null>(null);
  const [activa, setActiva] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [videoListo, setVideoListo] = useState(false);
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
  const [error, setError] = useState('');

  function liberarFoto() {
    if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    urlPrevia.current = null;
    setPrevisualizacion(null);
    onFotoChange(null);
  }

  function detenerCamara() {
    intentoActual.current += 1;
    flujo.current?.getTracks().forEach((pista) => pista.stop());
    flujo.current = null;
    if (video.current) video.current.srcObject = null;
    setActiva(false);
    setAbriendo(false);
    setVideoListo(false);
  }

  useEffect(
    () => () => {
      intentoActual.current += 1;
      flujo.current?.getTracks().forEach((pista) => pista.stop());
      flujo.current = null;
      if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    },
    [],
  );

  async function iniciarCamara() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceso a la cámara.');
      return;
    }

    const intento = intentoActual.current + 1;
    intentoActual.current = intento;
    setActiva(true);
    setAbriendo(true);
    setVideoListo(false);

    try {
      const nuevoFlujo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (intentoActual.current !== intento) {
        nuevoFlujo.getTracks().forEach((pista) => pista.stop());
        return;
      }

      const elementoVideo = video.current;
      if (!elementoVideo) {
        nuevoFlujo.getTracks().forEach((pista) => pista.stop());
        throw new Error('No se pudo preparar la cámara.');
      }

      flujo.current = nuevoFlujo;
      elementoVideo.srcObject = nuevoFlujo;
      await elementoVideo.play();
      if (intentoActual.current === intento) setAbriendo(false);
    } catch (errorCamara) {
      if (intentoActual.current !== intento) return;
      detenerCamara();
      setError(
        errorCamara instanceof DOMException &&
          ['NotAllowedError', 'PermissionDeniedError'].includes(errorCamara.name)
          ? 'Permite el acceso a la cámara para tomar la fotografía.'
          : 'No se pudo abrir la cámara. Verifica los permisos e inténtalo de nuevo.',
      );
    }
  }

  async function tomarFoto() {
    const elementoVideo = video.current;
    if (!elementoVideo || elementoVideo.videoWidth < 1 || elementoVideo.videoHeight < 1) {
      setError('La cámara todavía no está lista. Espera un momento e inténtalo de nuevo.');
      return;
    }

    const escala = Math.min(
      1,
      LADO_MAXIMO_FOTO / Math.max(elementoVideo.videoWidth, elementoVideo.videoHeight),
    );
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(elementoVideo.videoWidth * escala);
    lienzo.height = Math.round(elementoVideo.videoHeight * escala);
    const contexto = lienzo.getContext('2d');
    if (!contexto) {
      setError('No se pudo procesar la fotografía. Inténtalo de nuevo.');
      return;
    }

    contexto.drawImage(elementoVideo, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, 'image/jpeg', 0.84),
    );
    if (!blob) {
      setError('No se pudo procesar la fotografía. Inténtalo de nuevo.');
      return;
    }

    const foto = new File([blob], 'foto-producto.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    if (urlPrevia.current) URL.revokeObjectURL(urlPrevia.current);
    const url = URL.createObjectURL(foto);
    urlPrevia.current = url;
    setPrevisualizacion(url);
    onFotoChange(foto);
    setError('');
    detenerCamara();
  }

  return (
    <section className={styles.capturaFoto} aria-label="Fotografía del producto">
      <h2 className={styles.titulo}>Fotografía del producto (opcional)</h2>
      {previsualizacion && (
        <Image
          className={styles.previsualizacion}
          src={previsualizacion}
          alt="Vista previa de la fotografía del producto"
          width={800}
          height={600}
          unoptimized
        />
      )}
      {!activa ? (
        <Boton type="button" variante="secundario" onClick={() => void iniciarCamara()}>
          {previsualizacion ? 'Tomar otra fotografía' : 'Abrir cámara'}
        </Boton>
      ) : (
        <>
          <video
            ref={video}
            className={styles.video}
            muted
            playsInline
            autoPlay
            aria-label="Vista previa en vivo de la cámara"
            onCanPlay={() => setVideoListo(true)}
            onLoadedMetadata={() => setVideoListo(true)}
          />
          {abriendo && <p role="status">Abriendo cámara…</p>}
          <div className={styles.acciones}>
            <Boton
              type="button"
              onClick={() => void tomarFoto()}
              disabled={!videoListo}
            >
              Tomar fotografía
            </Boton>
            <Boton type="button" variante="fantasma" onClick={detenerCamara}>
              Cancelar
            </Boton>
          </div>
        </>
      )}
      {previsualizacion && (
        <Boton type="button" variante="fantasma" onClick={liberarFoto}>
          Quitar fotografía
        </Boton>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
