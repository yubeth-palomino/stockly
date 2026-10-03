import { redirect } from 'next/navigation';
import { UserManagement } from '@/components/users/UserManagement';
import { createClient } from '@/lib/supabase/server';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== 'string') redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') redirect('/dashboard');
  return <UserManagement />;
}