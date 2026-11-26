export function getSupabaseEnvironment() {
  if (process.env.VERCEL_ENV === 'preview') {
    const url = process.env.STOCKLY_PREVIEW_SUPABASE_URL;
    const publishableKey = process.env.STOCKLY_PREVIEW_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !publishableKey) {
      throw new Error(
        'Faltan STOCKLY_PREVIEW_SUPABASE_URL o STOCKLY_PREVIEW_SUPABASE_PUBLISHABLE_KEY en Preview.',
      );
    }

    return { url, publishableKey };
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL ||
    process.env.STOCKLY_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY ||
    process.env.STOCKLY_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_ANON_KEY ||
    process.env.STOCKLY_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return { url, publishableKey };
}
