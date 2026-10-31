import { NextResponse, type NextRequest } from 'next/server';
import { responderError } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { response, autenticado } = await updateSession(request);
  const ruta = request.nextUrl.pathname;
  const esPanel = ruta === '/panel' || ruta.startsWith('/panel/');
  const esApiPanel = ruta === '/api/panel' || ruta.startsWith('/api/panel/');

  if ((!esPanel && !esApiPanel) || autenticado) return response;

  if (esApiPanel) {
    const bloqueado = responderError(new ErrorDeNegocio('NO_AUTORIZADO'));
    response.cookies.getAll().forEach((cookie) => bloqueado.cookies.set(cookie));
    return bloqueado;
  }

  const destino = request.nextUrl.clone();
  destino.pathname = '/login';
  destino.search = '';
  destino.searchParams.set('next', `${ruta}${request.nextUrl.search}`);
  const redireccion = NextResponse.redirect(destino);
  response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  return redireccion;
}

export const config = {
  matcher: [
    '/panel/:path*',
    '/api/panel/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
