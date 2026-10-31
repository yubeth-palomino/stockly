# Fase 0 completada · Stockly

Fecha: 2026-10-31

## Resultado de compilación

`npm run build`: correcto. Next.js 16.3.5 compiló, completó la comprobación de TypeScript y generó 21 páginas estáticas.

## Seguridad y conexión

- La persona usuaria confirmó que completó la rotación de credenciales, el cambio de contraseñas y la actualización de `.env.local` y Vercel.
- `.env.local` está excluido por `.gitignore`.
- `.env.local` contiene las variables `STOCKLY_POSTGRES_URL`, `STOCKLY_POSTGRES_URL_NON_POOLING` y `STOCKLY_POSTGRES_PRISMA_URL`; `.env.example` no contiene una URL Postgres.
- Se propone `STOCKLY_POSTGRES_URL` para la conexión de aplicación. El endpoint/estilo de pooling debe confirmarse en Supabase sin exponer la URL.

## Login y vínculo con Stockly

- El login existente usa Supabase Auth y Supabase SSR; la página es `/login` y el formulario actualmente redirige a `/dashboard`.
- La migración local crea `public.users`, vinculada por `id` UUID a `auth.users.id`. Sus roles actuales son `admin/user`.
- Stockly debe vincular la nueva fila `usuarios.auth_ref` usando el UUID de Supabase Auth, no el correo. La tabla y roles del módulo Stockly son independientes de `public.users`.
- No se consultó la base remota; la existencia/aplicación efectiva de tablas y migraciones queda pendiente de verificación.

## Decisiones para las siguientes fases

- Protección existente: `src/proxy.ts`, actualmente solo renueva claims.
- No existe mecanismo local para aplicar migraciones; P01 debe crear `scripts/migrar.mjs`.
- M1 propuesta: `20261031000100_stockly_tablas.sql`.
- M2 propuesta: `20261031000200_stockly_vista_seguridad.sql`.
- Variable propuesta para `lib/db/conexion.ts`: `STOCKLY_POSTGRES_URL`.
- Alias de imports para `lib`: `@/lib/...`.
- No hay rutas `/panel`, `lib/dataService.ts` ya existe con otro propósito y `components/ui/` no existe.
