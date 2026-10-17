'use client';

import { useState, type FormEvent } from 'react';

export function PruebaCorreoForm() {
  const [para, setPara] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [correcto, setCorrecto] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje('');
    setCorrecto(false);

    try {
      const respuesta = await fetch('/api/correo/prueba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ para }),
      });
      const resultado = (await respuesta.json()) as { mensaje?: string; error?: string };
      if (!respuesta.ok) throw new Error(resultado.error ?? 'No se pudo enviar el correo.');
      setCorrecto(true);
      setMensaje(resultado.mensaje ?? 'Correo enviado');
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo enviar el correo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="correo-form">
      <label htmlFor="correo-destino">Correo de destino</label>
      <input
        id="correo-destino"
        type="email"
        autoComplete="email"
        required
        value={para}
        onChange={(evento) => setPara(evento.target.value)}
        placeholder="tu@correo.com"
      />
      <button type="submit" disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar prueba'}
      </button>
      {mensaje && <p role="status" className={correcto ? 'correo-ok' : 'correo-error'}>{mensaje}</p>}
      <style jsx>{`
        .correo-form { display: grid; gap: 12px; }
        label { color: #52615e; font: 13px Arial, sans-serif; }
        input { min-height: 46px; padding: 0 13px; border: 1px solid #d8e2de; border-radius: 6px; color: #172322; background: #fff; font: 14px Arial, sans-serif; }
        input:focus { outline: 2px solid #087f7040; border-color: #087f70; }
        button { min-height: 46px; border: 0; border-radius: 6px; color: #fff; background: #087f70; font: 14px Arial, sans-serif; }
        button:disabled { cursor: wait; opacity: .65; }
        p { margin: 4px 0 0; font: 13px Arial, sans-serif; }
        .correo-ok { color: #087f70; }
        .correo-error { color: #b44735; }
      `}</style>
    </form>
  );
}