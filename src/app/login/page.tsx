import { LoginForm } from '@/components/auth/LoginForm';
import { rutaInternaSegura } from '@/lib/reglas/redireccion';

type LoginPageProps = {
  searchParams: Promise<{ restablecida?: string; next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parametros = await searchParams;
  const destino = rutaInternaSegura(
    Array.isArray(parametros.next) ? parametros.next[0] : parametros.next,
  );
  return (
    <LoginForm
      passwordUpdated={parametros.restablecida === '1'}
      destino={destino}
    />
  );
}