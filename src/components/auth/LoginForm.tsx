'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import styles from './LoginForm.module.css';

type LoginErrors = { email?: string | undefined; password?: string | undefined };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [authError, setAuthError] = useState('');
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
      // TODO: conectar con la API real.
      await new Promise((resolve) => window.setTimeout(resolve, 450));

      if (normalizedEmail.toLowerCase() === 'demo@stockly.com' && password === 'demo1234') {
        router.push('/');
      } else {
        setAuthError('Correo o contraseña incorrectos');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.brandPanel} aria-label="Stockly">
        <Link className={styles.brand} href="/" aria-label="Stockly, inicio">
          <span className={styles.brandMark}>S</span>
          <span>stockly</span>
        </Link>

        <div className={styles.brandMessage}>
          <p className={styles.kicker}>CONTROL DE INVENTARIO</p>
          <h1>Todo en su lugar.</h1>
          <p>Una vista clara de cada producto, movimiento y alerta.</p>
        </div>

        <div className={styles.stockNote} aria-hidden="true">
          <span className={styles.noteLabel}>RESUMEN DE EXISTENCIAS</span>
          <div className={styles.stockLine}>
            <span>Productos activos</span>
            <strong>248</strong>
            <i className={styles.stockBar} />
          </div>
          <div className={styles.stockLine}>
            <span>Movimientos hoy</span>
            <strong>36</strong>
            <i className={`${styles.stockBar} ${styles.stockBarShort}`} />
          </div>
          <div className={styles.stockLine}>
            <span>Alertas pendientes</span>
            <strong className={styles.alertCount}>03</strong>
            <i className={`${styles.stockBar} ${styles.stockBarAlert}`} />
          </div>
        </div>

        <span className={styles.panelIndex}>01 / STOCKLY</span>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileBrand} aria-hidden="true">
          <span className={styles.brandMark}>S</span>
          <span>stockly</span>
        </div>

        <div className={styles.formContent}>
          <p className={styles.formKicker}>BIENVENIDO DE NUEVO</p>
          <h2>Inicia sesión</h2>
          <p className={styles.formIntro}>Ingresa tus datos para continuar a tu espacio de trabajo.</p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="email">Correo electrónico</label>
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
              {errors.email && (
                <span className={styles.fieldError} id="email-error">
                  {errors.email}
                </span>
              )}
            </div>

            <div className={styles.field}>
              <div className={styles.passwordLabel}>
                <label htmlFor="password">Contraseña</label>
                <a href="#forgot-password" onClick={(event) => event.preventDefault()}>
                  Olvidé mi contraseña
                </a>
              </div>
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
                type="password"
                value={password}
              />
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

            <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>
        </div>

        <p className={styles.formFooter}>Stockly <span>·</span> Gestión de inventario</p>
      </section>
    </main>
  );
}