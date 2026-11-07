import { NextResponse } from 'next/server';
import { consultar } from '@/lib/db/conexion';
import { createClient } from '@/lib/supabase/server';

type FilaAccesoStockly = {
  id: string;
  nombre: string;
  rol: string;
};

function respuesta(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respuesta('Solicitud inválida.', 400);
  }

  if (!body || typeof body !== 'object') {
    return respuesta('Correo o contraseña incorrectos.', 401);
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return respuesta('Correo o contraseña incorrectos.', 401);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError || !authData.user || !authData.session) {
    return respuesta('Correo o contraseña incorrectos.', 401);
  }

  let usuarios: FilaAccesoStockly[];
  try {
    usuarios = await consultar<FilaAccesoStockly>(
      `SELECT id, nombre, rol
       FROM usuarios
       WHERE auth_ref = $1 AND activo = true
       LIMIT 1`,
      [authData.user.id],
    );
  } catch (error) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    console.error('No se pudo validar el acceso a Stockly después de autenticar.', error);
    if (signOutError) {
      console.error('Tampoco se pudo cerrar la sesión no validada de Supabase.', signOutError);
    }
    return respuesta('No se pudo validar el acceso a Stockly. Intenta nuevamente.', 503);
  }

  const usuario = usuarios[0];
  if (!usuario || (usuario.rol !== 'dueno' && usuario.rol !== 'trabajador')) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      console.error('No se pudo cerrar la sesión de una cuenta sin acceso activo a Stockly.', signOutError);
      return respuesta('No se pudo completar el inicio de sesión. Intenta nuevamente.', 503);
    }
    return respuesta('Esta cuenta no tiene acceso activo a Stockly. Contacta al dueño.', 403);
  }

  return NextResponse.json(
    { user: usuario },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}