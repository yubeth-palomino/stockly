import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams;
  return <ResetPasswordForm hasInvalidLink={error === 'link'} />;
}
