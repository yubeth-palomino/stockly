import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PruebaCorreoForm } from '@/components/correo/PruebaCorreoForm';
import styles from './page.module.css';

export default function PruebaCorreoPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/">Stockly</Link>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Configuración local</p>
        <h1>Prueba de correo</h1>
        <p className={styles.description}>Envía un mensaje para comprobar la conexión con Resend.</p>
        <PruebaCorreoForm />
      </section>
    </main>
  );
}