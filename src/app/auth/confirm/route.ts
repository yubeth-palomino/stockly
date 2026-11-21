import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const redirectUrl = new URL('/reset-password', request.url);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirectUrl.searchParams.set('error', 'link');
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (!tokenHash || (type !== 'invite' && type !== 'recovery')) {
    redirectUrl.searchParams.set('error', 'link');
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    redirectUrl.searchParams.set('error', 'link');
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
