'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

type ErroresRegistro = {
  nombre?: string | undefined;
  correo?: string | undefined;
  contrasena?: string | undefined;
};

function IconoMarca() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M5 18V6h4l3 5 3-5h4v12h-4v-6l-3 4-3-4v6H5Z" />
    </svg>
  );
}

function IconoCorreo() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
      <path d="m5 7 7 5.5L19 7" />
    </svg>
  );
}

function IconoVisibilidad({ visible }: { visible: boolean }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {!visible && <path d="m4 20 16-16" />}
    </svg>
  );
}

export function RegisterForm() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [errorRegistro, setErrorRegistro] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim();
    const nuevosErrores: ErroresRegistro = {};

    if (nombreLimpio.length < 2) nuevosErrores.nombre = 'Ingresa tu nombre completo.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      nuevosErrores.correo = 'Ingresa un correo electrónico válido.';
    }
    if (contrasena.length < 8) {
      nuevosErrores.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (contrasena.length > 72) {
      nuevosErrores.contrasena = 'La contraseña no puede superar 72 caracteres.';
    }

    setErrores(nuevosErrores);
    setErrorRegistro('');
    setMensaje('');
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreLimpio,
          correo: correoLimpio,
          contrasena,
        }),
      });
      const resultado = (await response.json()) as {
        error?: string;
        sesion?: boolean;
        mensaje?: string;
      };

      if (!response.ok) {
        setErrorRegistro(resultado.error ?? 'No se pudo crear la cuenta. Intenta nuevamente.');
        return;
      }

      if (resultado.sesion) {
        window.location.replace('/panel');
        return;
      }
      setMensaje(
        resultado.mensaje ??
          'Revisa tu correo y confirma la cuenta para entrar a tu espacio de trabajo.',
      );
    } catch {
      setErrorRegistro('No fue posible conectar con el servidor. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={`${styles.loginPage} ${styles.loginPrincipal}`}>
      <section className={styles.brandPanel} aria-label="Stockly">
        <Link className={styles.brand} href="/" aria-label="Stockly, inicio">
          <span className={styles.brandMark}>
            <IconoMarca />
          </span>
          <span>stockly</span>
        </Link>

        <div className={styles.brandMessage}>
          <p className={styles.kicker}>TU NEGOCIO, EN ORDEN</p>
          <h1>Tu espacio empieza aquí.</h1>
          <p>Crea tu negocio y organiza productos, ventas y equipo en un solo lugar.</p>
        </div>

        <div className={styles.stockNote}>
          <span className={styles.noteLabel}>UN ESPACIO PROPIO</span>
          <p className={styles.stockDescription}>
            Tu cuenta comienza con un inventario vacío. Invita a tus trabajadores cuando quieras.
          </p>
        </div>

        <span className={styles.panelIndex}>01 / STOCKLY</span>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand} aria-hidden="true">
          <span className={styles.brandMark}>
            <IconoMarca />
          </span>
          <span>stockly</span>
        </div>

        <div className={styles.formContent}>
          <p className={styles.formKicker}>CREA TU ESPACIO</p>
          <h2>Crear cuenta gratis</h2>
          <p className={styles.formIntro}>
            Registra tu negocio y empieza a organizar tu inventario.
          </p>

          {mensaje && (
            <p className={styles.recoveryMessage} role="status">
              {mensaje}
            </p>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="nombre">Nombre completo</label>
              <input
                autoComplete="name"
                className={errores.nombre ? styles.inputError : ''}
                id="nombre"
                name="name"
                onChange={(event) => {
                  setNombre(event.target.value);
                  setErrores((actuales) => ({ ...actuales, nombre: undefined }));
                  setErrorRegistro('');
                }}
                aria-describedby={errores.nombre ? 'nombre-error' : undefined}
                aria-invalid={Boolean(errores.nombre)}
                placeholder="Tu nombre y apellido"
                value={nombre}
              />
              {errores.nombre && (
                <span className={styles.fieldError} id="nombre-error">
                  {errores.nombre}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="correo-registro">Correo electrónico</label>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>
                  <IconoCorreo />
                </span>
                <input
                  autoComplete="email"
                  className={errores.correo ? styles.inputError : ''}
                  id="correo-registro"
                  name="email"
                  onChange={(event) => {
                    setCorreo(event.target.value);
                    setErrores((actuales) => ({ ...actuales, correo: undefined }));
                    setErrorRegistro('');
                  }}
                  aria-describedby={errores.correo ? 'correo-error' : undefined}
                  aria-invalid={Boolean(errores.correo)}
                  placeholder="nombre@empresa.com"
                  type="email"
                  value={correo}
                />
              </div>
              {errores.correo && (
                <span className={styles.fieldError} id="correo-error">
                  {errores.correo}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="contrasena-registro">Contraseña</label>
              <div className={styles.passwordInput}>
                <input
                  autoComplete="new-password"
                  className={errores.contrasena ? styles.inputError : ''}
                  id="contrasena-registro"
                  name="password"
                  onChange={(event) => {
                    setContrasena(event.target.value);
                    setErrores((actuales) => ({ ...actuales, contrasena: undefined }));
                    setErrorRegistro('');
                  }}
                  aria-describedby={errores.contrasena ? 'contrasena-error' : undefined}
                  aria-invalid={Boolean(errores.contrasena)}
                  placeholder="Al menos 8 caracteres"
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasena}
                />
                <button
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={mostrarContrasena}
                  className={styles.passwordToggle}
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                  type="button"
                >
                  <IconoVisibilidad visible={mostrarContrasena} />
                  <span>{mostrarContrasena ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              {errores.contrasena && (
                <span className={styles.fieldError} id="contrasena-error">
                  {errores.contrasena}
                </span>
              )}
            </div>

            {errorRegistro && (
              <p className={styles.authError} aria-live="polite">
                {errorRegistro}
              </p>
            )}

            <button
              aria-busy={enviando}
              className={styles.submitButton}
              disabled={enviando}
              type="submit"
            >
              {enviando ? 'Creando cuenta…' : 'Crear cuenta gratis'}
            </button>
          </form>

          <div className={styles.registerPrompt}>
            <Link className={styles.registerLink} href="/login">
              ¿Ya tienes cuenta? Iniciar sesión
            </Link>
          </div>
        </div>

        <p className={styles.formFooter}>
          Stockly <span>·</span> Gestión de inventario
        </p>
      </section>
    </main>
  );
}
