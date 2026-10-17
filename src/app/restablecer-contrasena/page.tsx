import { RestablecerContrasenaForm } from '@/components/auth/RestablecerContrasenaForm';

type RestablecerContrasenaPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function RestablecerContrasenaPage({ searchParams }: RestablecerContrasenaPageProps) {
  const parametros = await searchParams;
  const token = Array.isArray(parametros.token) ? parametros.token[0] ?? null : parametros.token ?? null;
  return <RestablecerContrasenaForm token={token} />;
}