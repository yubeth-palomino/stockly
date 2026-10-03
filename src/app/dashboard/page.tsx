import { redirect } from 'next/navigation';
import { StocklyHome } from '@/components/home/StocklyHome';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== 'string') redirect('/login');

  const { data: user, error: profileError } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !user) redirect('/login');
  return <StocklyHome user={user} />;
}