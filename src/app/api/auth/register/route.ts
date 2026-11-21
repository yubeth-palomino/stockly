import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { conTransaccion } from '@/lib/db/conexion';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { obtenerUrlBase } from '@/lib/urlBase';
import { esquemaRegistroDueno } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

function respuesta(
  cuerpo: { error?: string; sesion?: boolean; mensaje?: string },
  status: number,
) {
  return NextResponse.json(cuerpo, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function usuarioDesdeCorreo(correo: string, authId: string): string {
  const local = correo
    .split('@')[0]
    ?.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 60)
    .toLowerCase();

  return local && local.length >= 3 ? local : `dueno-${authId.slice(0, 8)}`;
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuesta({ error: 'Solicitud inválida.' }, 400);
  }

  const validacion = esquemaRegistroDueno.safeParse(cuerpo);
  if (!validacion.success) {
    return respuesta({ error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }, 400);
  }

  const { nombre, correo, contrasena } = validacion.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: contrasena,
    options: {
      data: { full_name: nombre },
      emailRedirectTo: new URL(
        '/auth/confirm?next=%2Fpanel',
        obtenerUrlBase(),
      ).toString(),
    },
  });

  if (error || !data.user) {
    if (error?.code === 'email_exists' || error?.code === 'user_already_exists') {
      return respuesta(
        { error: 'No fue posible crear la cuenta con esos datos. Verifica el correo o inicia sesión.' },
        409,
      );
    }
    console.error('No se pudo crear la cuenta de autenticación para el registro Stockly.', error);
    return respuesta({ error: 'No se pudo crear la cuenta. Intenta nuevamente.' }, 400);
  }

  if (data.user.identities?.length === 0) {
    return respuesta(
      { error: 'No fue posible crear la cuenta con esos datos. Verifica el correo o inicia sesión.' },
      409,
    );
  }

  const authId = data.user.id;
  const sucursalId = randomUUID();
  const nombreEmpresa = `Negocio de ${nombre}`;
  const usuario = usuarioDesdeCorreo(correo, authId);

  try {
    await conTransaccion(async (tx) => {
      const empresa = await tx.query<{ id: string }>(
        `INSERT INTO public.empresas (nombre)
         VALUES ($1)
         RETURNING id`,
        [nombreEmpresa],
      );
      const empresaId = empresa.rows[0]?.id;
      if (!empresaId) throw new Error('No se pudo crear el negocio del nuevo usuario.');

      const perfil = await tx.query<{ id: string }>(
        `INSERT INTO public.usuarios (nombre, usuario, rol, auth_ref, empresa_id)
         VALUES ($1, $2, 'dueno', $3, $4)
         RETURNING id`,
        [nombre, usuario, authId, empresaId],
      );
      const usuarioId = perfil.rows[0]?.id;
      if (!usuarioId) throw new Error('No se pudo crear el perfil del nuevo dueño.');

      await tx.query(
        `INSERT INTO public.sucursales (id, empresa_id, nombre)
         VALUES ($1, $2, 'Sucursal principal')`,
        [sucursalId, empresaId],
      );
      await tx.query(
        `INSERT INTO public.empresas_usuarios
           (empresa_id, usuario_id, rol, alcance_sucursales, activo)
         VALUES ($1, $2, 'dueno', 'todas', true)`,
        [empresaId, usuarioId],
      );
      await tx.query(
        `INSERT INTO public.usuarios_sucursales (empresa_id, usuario_id, sucursal_id)
         VALUES ($1, $2, $3)`,
        [empresaId, usuarioId, sucursalId],
      );
    });
  } catch (error) {
    console.error('No se pudo crear el espacio de trabajo del nuevo dueño.', error);
    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(authId);
    if (deleteError) {
      console.error('No se pudo revertir la cuenta Auth del registro incompleto.', deleteError);
    }
    if (data.session) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        console.error('No se pudo cerrar la sesión de un registro incompleto.', signOutError);
      }
    }
    return respuesta({ error: 'No se pudo preparar el negocio. Intenta nuevamente.' }, 503);
  }

  if (data.session) {
    return respuesta({ sesion: true }, 201);
  }

  return respuesta(
    {
      sesion: false,
      mensaje: 'Revisa tu correo y confirma la cuenta para entrar a tu espacio de trabajo.',
    },
    201,
  );
}
