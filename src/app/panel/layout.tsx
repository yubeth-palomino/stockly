import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { obtenerUsuario } from '@/lib/auth/sesion';
import { Aviso } from '@/components/ui/Aviso';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { NavegacionPanel } from '@/components/panel/NavegacionPanel';
import styles from '@/components/panel/panel.module.css';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const usuario = await obtenerUsuario();
  if (usuario) {
    return (
      <>
        <NavegacionPanel rol={usuario.rol} nombre={usuario.nombre} />
        <main className={styles.contenido}>{children}</main>
      </>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') throw error;
  if (!data.user) redirect('/login');

  return (
    <main className={styles.avisoCuenta}>
      <section className={styles.tarjetaCuenta}>
        <h1>Tu cuenta aún no está dada de alta</h1>
        <Aviso tipo="advertencia">
          Tu cuenta no está dada de alta en Stockly. Pide a un dueño que te registre.
        </Aviso>
        <LogoutButton />
      </section>
    </main>
  );
}
