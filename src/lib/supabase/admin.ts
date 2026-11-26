import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnvironment } from './server';

export function createAdminClient() {
  const { url } = getSupabaseEnvironment();
  const variableClave =
    process.env.VERCEL_ENV === 'preview'
      ? 'STOCKLY_PREVIEW_SUPABASE_SERVICE_ROLE_KEY'
      : 'STOCKLY_SUPABASE_SERVICE_ROLE_KEY';
  const serviceRoleKey = process.env[variableClave];

  if (!serviceRoleKey) {
    throw new Error(`Falta ${variableClave} en el servidor.`);
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}