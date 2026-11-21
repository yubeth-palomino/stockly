'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

type LoginErrors = { email?: string | undefined; password?: string | undefined };

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

function IconoCandado() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <rect x="4.5" y="10" width="15" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
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

function IconoFlecha() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}

export function LoginForm({
  passwordUpdated = false,
  destino = '/panel',
}: {
  passwordUpdated?: boolean;
  destino?: string;
}) {
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [authError, setAuthError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Ingresa tu correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      nextErrors.password = 'Ingresa tu contraseña.';
    }

    setErrors(nextErrors);
    setAuthError('');

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (response.ok) {
        window.location.replace(destino);
      } else {
        const result = (await response.json()) as { error?: string };
        setAuthError(result.error ?? 'Correo o contraseña incorrectos');
      }
    } catch {
      setAuthError('No fue posible conectar con el servidor. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrors({
        email: normalizedEmail
          ? 'Ingresa un correo electrónico válido.'
          : 'Ingresa tu correo electrónico.',
      });
      return;
    }

    setErrors({});
    setAuthError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setAuthError(result.error ?? 'No se pudo solicitar el correo. Intenta nuevamente.');
        return;
      }
      setRecoveryMessage(
        result.message ?? 'Si existe una cuenta asociada, recibirás un correo con instrucciones.',
      );
    } catch {
      setAuthError('No fue posible conectar con el servidor. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
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
          <p className={styles.kicker}>CONTROL DE INVENTARIO</p>
          <h1>Todo en su lugar.</h1>
          <p>Una vista clara de cada producto, movimiento y alerta.</p>
        </div>

        <div className={styles.brandArtwork} aria-hidden="true">
          <svg viewBox="0 0 420 230" role="presentation">
            <defs>
              <linearGradient id="login-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8B7CF6" stopOpacity=".42" />
                <stop offset="100%" stopColor="#8B7CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="418" height="228" rx="26" fill="#2A2B4A" />
            <path
              d="M32 177c38-16 51-65 91-50 37 14 49 23 84-12s55 18 88-9 49-46 93-31v124H32Z"
              fill="url(#login-area)"
            />
            <path
              d="M32 177c38-16 51-65 91-50 37 14 49 23 84-12s55 18 88-9 49-46 93-31"
              fill="none"
              stroke="#7EDDDD"
              strokeLinecap="round"
              strokeWidth="4"
            />
            <path d="M34 195h350" stroke="#A0A0C0" strokeOpacity=".35" />
            <rect x="47" y="139" width="20" height="56" rx="10" fill="#8B7CF6" />
            <rect x="83" y="119" width="20" height="76" rx="10" fill="#C4B5FD" />
            <rect x="119" y="135" width="20" height="60" rx="10" fill="#7EDDDD" />
            <circle cx="295" cy="105" r="6" fill="#FFFFFF" />
          </svg>
        </div>

        <div className={styles.stockNote} aria-hidden="true">
          <span className={styles.noteLabel}>GESTIÓN COMERCIAL</span>
          <p className={styles.stockDescription}>
            Organiza productos, ventas y movimientos en un solo lugar.
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
          <p className={styles.formKicker}>
            {mode === 'login' ? 'BIENVENIDO DE NUEVO' : 'RECUPERACIÓN DE CUENTA'}
          </p>
          <h2>{mode === 'login' ? 'Inicia sesión' : 'Restablece tu contraseña'}</h2>
          <p className={styles.formIntro}>
            {mode === 'login'
              ? 'Ingresa tus datos para continuar a tu espacio de trabajo.'
              : 'Te enviaremos un enlace para crear una contraseña nueva.'}
          </p>

          {passwordUpdated && (
            <p className={styles.recoveryMessage} role="status">
              Tu contraseña se restableció correctamente. Inicia sesión con la nueva contraseña.
            </p>
          )}

          {mode === 'login' ? (
            <>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="email">Correo electrónico</label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.inputIcon}>
                    <IconoCorreo />
                  </span>
                  <input
                    autoComplete="email"
                    className={errors.email ? styles.inputError : ''}
                    id="email"
                    name="email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors((current) => ({ ...current, email: undefined }));
                      setAuthError('');
                    }}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    aria-invalid={Boolean(errors.email)}
                    placeholder="nombre@empresa.com"
                    type="email"
                    value={email}
                  />
                </div>
                {errors.email && (
                  <span className={styles.fieldError} id="email-error">
                    {errors.email}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <div className={styles.passwordLabel}>
                  <label htmlFor="password">Contraseña</label>
                  <Link
                    className={styles.forgotPassword}
                    href="/recuperar-contrasena"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className={styles.passwordInput}>
                  <span className={styles.inputIcon}>
                    <IconoCandado />
                  </span>
                  <input
                    autoComplete="current-password"
                    className={errors.password ? styles.inputError : ''}
                    id="password"
                    name="password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrors((current) => ({ ...current, password: undefined }));
                      setAuthError('');
                    }}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    aria-invalid={Boolean(errors.password)}
                    placeholder="Ingresa tu contraseña"
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={password}
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
                {errors.password && (
                  <span className={styles.fieldError} id="password-error">
                    {errors.password}
                  </span>
                )}
              </div>

              {authError && (
                <p className={styles.authError} aria-live="polite">
                  {authError}
                </p>
              )}

              <button
                aria-busy={isSubmitting}
                className={styles.submitButton}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
                {!isSubmitting && <IconoFlecha />}
              </button>
            </form>
            <div className={styles.registerPrompt}>
              <span className={styles.registerDivider}>o</span>
              <Link className={styles.registerLink} href="/register">
                ¿No tienes cuenta? Crear cuenta gratis
              </Link>
            </div>
            </>
          ) : recoveryMessage ? (
            <div className={styles.form}>
              <p className={styles.recoveryMessage} role="status">
                {recoveryMessage}
              </p>
              <button
                className={styles.submitButton}
                type="button"
                onClick={() => {
                  setMode('login');
                  setRecoveryMessage('');
                  setAuthError('');
                }}
              >
                Volver a iniciar sesión
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleRecoverySubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="recovery-email">Correo electrónico</label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.inputIcon}>
                    <IconoCorreo />
                  </span>
                  <input
                    autoComplete="email"
                    className={errors.email ? styles.inputError : ''}
                    id="recovery-email"
                    name="email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors({});
                      setAuthError('');
                    }}
                    aria-describedby={errors.email ? 'recovery-email-error' : undefined}
                    aria-invalid={Boolean(errors.email)}
                    placeholder="nombre@empresa.com"
                    type="email"
                    value={email}
                  />
                </div>
                {errors.email && (
                  <span className={styles.fieldError} id="recovery-email-error">
                    {errors.email}
                  </span>
                )}
              </div>
              {authError && (
                <p className={styles.authError} aria-live="polite">
                  {authError}
                </p>
              )}
              <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
              <button
                className={styles.backToLogin}
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                  setAuthError('');
                  setRecoveryMessage('');
                }}
              >
                Volver a iniciar sesión
              </button>
            </form>
          )}
        </div>

        <p className={styles.formFooter}>
          Stockly <span>·</span> Gestión de inventario
        </p>
      </section>
    </main>
  );
}
