import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvironment } from './server';

export function createAdminClient() {
  const { url } = getSupabaseEnvironment();
  const serviceRoleKey = process.env.STOCKLY_SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Falta STOCKLY_SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}