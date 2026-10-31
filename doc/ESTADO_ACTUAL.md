# Estado actual del repositorio · Stockly

Auditoría P00 realizada el 2026-10-31. Los valores de las variables de entorno no se incluyen en este documento.

## 1. Versiones

Versiones declaradas en `package.json`:

| Paquete | Versión |
|---|---|
| next | `^16.3.5` |
| react | `^19.3.0` |
| typescript | `^6.0.3` |
| tailwindcss | No existe |
| pg | `^8.23.1` |
| zod | `^4.6.2` |
| @supabase/supabase-js | `^2.117.2` |
| jose | No existe |
| bcryptjs | No existe |
| vitest | `^5.0.0` |

## 2. Scripts de `package.json`

| Script | Comando |
|---|---|
| `dev` | `node scripts/tokenVercel.mjs && next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint .` |
| `format` | `prettier --write "src/**/*.{ts,tsx,css}"` |
| `type-check` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:ver` | `vitest` |
| `db:migrar` | `node --env-file=.env.local scripts/migrar.mjs` |
| `db:verificar` | `node --env-file=.env.local scripts/verificar-bd.mjs` |
| `db:vincular-dueno` | `node --env-file=.env.local scripts/vincular-dueno.mjs` |
| `db:limpiar` | `node --env-file=.env.local scripts/limpiar-prueba.mjs` |
| `db:demo` | `node --env-file=.env.local --import tsx scripts/cargar-demo.ts` |
| `probar:flujo` | `node --env-file=.env.local --import tsx scripts/probar-flujo.ts` |

## 3. Estructura

El proyecto sí usa `src/`. Árbol resumido (hasta tres niveles):

```text
src/
├── app/
│   ├── api/
│   │   ├── admin/users/
│   │   ├── auth/{change-password,login,logout,recover-password,recuperar,reset-password,restablecer}/
│   │   ├── correo/prueba/
│   │   ├── data/[collection]/
│   │   └── health/
│   ├── auth/confirm/
│   ├── dashboard/
│   ├── login/
│   ├── prueba-correo/
│   ├── recuperar-contrasena/
│   ├── reset-password/
│   ├── restablecer-contrasena/
│   ├── users/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   ├── correo/
│   ├── home/
│   └── users/
├── lib/
│   ├── supabase/
│   ├── config/stockly.ts
│   ├── reglas/{errores,fechas,roles,producto,venta,economia}.ts
│   ├── correo.ts
│   ├── dataService.ts
│   ├── json-db.ts
│   ├── plantillasCorreo.ts
│   ├── tokenRecuperacion.ts
│   ├── types.ts
│   ├── urlBase.ts
│   ├── user-validation.ts
│   └── utils.ts
├── test/
│   └── setup.ts
└── proxy.ts

supabase/
├── migrations/
│   ├── 20261003000100_create_users_profiles.sql
│   ├── 20261031000100_stockly_tablas.sql
│   └── 20261031000200_stockly_vista_seguridad.sql
└── restablecimientos_contrasena.sql

scripts/
├── tokenVercel.mjs
├── db-client.mjs
├── migrar.mjs
└── verificar-bd.mjs

tests/reglas/
├── ayudas.ts
├── producto.test.ts
├── venta.test.ts
├── fechas.test.ts
├── roles.test.ts
└── economia.test.ts

data/
├── _backups/
├── _schema/
├── example.json
├── products.json
└── sessions.json
```

## 4. Alias de importación

En `tsconfig.json`, `@/*` apunta a `./src/*` y `@data/*` apunta a `./data/*`. Por ello, las importaciones de `lib` usan `@/lib/...`.

## 5. Autenticación

- Mecanismo: Supabase Auth con correo y contraseña, integrado con `@supabase/ssr`. No es un JWT propio.
- Archivos principales: `src/app/login/page.tsx`, `src/components/auth/LoginForm.tsx`, `src/app/api/auth/login/route.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts` y `src/proxy.ts`.
- Archivos relacionados: `src/app/api/auth/logout/route.ts`, `src/components/auth/LogoutButton.tsx`, `src/app/api/auth/{change-password,recover-password,recuperar,reset-password,restablecer}/`, `src/app/auth/confirm/` y los formularios en `src/components/auth/`.
- Cookie: la administra Supabase SSR a partir del proyecto; su nombre efectivo depende del identificador del proyecto (formato habitual `sb-<project-ref>-auth-token`, potencialmente fragmentado). El código no lee una cookie de sesión con nombre fijo.
- Lectura/renovación de sesión: no existe un adaptador exportado que devuelva el usuario actual. `updateSession` en `src/lib/supabase/proxy.ts` llama `supabase.auth.getClaims()` para validar/refrescar las claims, pero no devuelve un perfil ni un rol.
- Roles: el login obtiene un perfil desde `public.users` y devuelve su rol actual (`admin` o `user`). No implementa los roles de negocio `dueno` y `trabajador` del plan.
- Página de login: `/login`.
- Después de autenticar: `src/components/auth/LoginForm.tsx` reemplaza la ruta por `/panel`.
- Protección/proxy: `src/proxy.ts` protege `/panel/:path*` y `/api/panel/:path*`; las API verifican también el perfil activo Stockly.
- Perfil y rol Stockly: `src/lib/auth/sesion.ts` vincula el UUID de Supabase Auth con `usuarios.auth_ref` y devuelve el rol Stockly activo.
- Cierre de sesión: POST `/api/auth/logout`, que llama `supabase.auth.signOut({ scope: 'local' })`; el botón navega a `/login`.
- Tabla de perfil existente en la migración local: `public.users`, columnas `id` (UUID, referencia a `auth.users.id`), `email`, `full_name`, `role` (`admin` o `user`), `created_at` y `updated_at`. No es la tabla `usuarios` requerida por el módulo Stockly.
- P01 verificó en la base remota `public.users` con las columnas anteriores y sus objetos del login (índice, función de perfil y trigger de Auth). También confirmó que antes de P01 no existían `usuarios`, `productos`, `ventas`, `eventos_inventario`, `v_productos` ni `_migrations`. La migración del perfil se registró sin reejecutarla y M1/M2 se aplicaron.

## 6. Acceso a datos

- Clientes Supabase: `src/lib/supabase/server.ts` (cliente SSR), `src/lib/supabase/admin.ts` (cliente administrativo) y `src/lib/supabase/proxy.ts` (renovación de sesión).
- `src/lib/dataService.ts` conserva sus operaciones de recuperación y, desde P04, expone los casos de uso Stockly.
- `src/lib/db/conexion.ts` administra el pool de `pg`; `src/lib/datos/` concentra las consultas y transacciones del módulo Stockly.
- `src/lib/json-db.ts` y los JSON de `data/` son otra superficie de persistencia del proyecto.

## 7. Migraciones

- Carpeta: `supabase/migrations/`.
- Migración local existente: `20261003000100_create_users_profiles.sql`.
- También existe `supabase/restablecimientos_contrasena.sql`.
- No se encontró un script de migración, una tabla de control de migraciones ni una página que aplique migraciones.
- No se verificó qué archivos ya fueron aplicados en Supabase.

## 8. Variables de entorno

Solo nombres encontrados; nunca se copiaron valores.

`.env.local`:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_ANON_KEY`, `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL`, `STOCKLY_POSTGRES_DATABASE`, `STOCKLY_POSTGRES_HOST`, `STOCKLY_POSTGRES_PASSWORD`, `STOCKLY_POSTGRES_PRISMA_URL`, `STOCKLY_POSTGRES_URL`, `STOCKLY_POSTGRES_URL_NON_POOLING`, `STOCKLY_POSTGRES_USER`, `STOCKLY_SUPABASE_JWT_SECRET`, `STOCKLY_SUPABASE_SECRET_KEY`, `STOCKLY_SUPABASE_SERVICE_ROLE_KEY`, `STOCKLY_SUPABASE_URL`, `VERCEL_OIDC_TOKEN`.

`.env.example`:
`NODE_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `DATA_DIR`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `STOCKLY_SUPABASE_SERVICE_ROLE_KEY`.

Hay cadenas de conexión PostgreSQL configuradas en `.env.local`: `STOCKLY_POSTGRES_URL`, `STOCKLY_POSTGRES_URL_NON_POOLING` y `STOCKLY_POSTGRES_PRISMA_URL`. El archivo de ejemplo no incluye ninguna. En la comprobación P01, `STOCKLY_POSTGRES_URL` (puerto 6543, pooler de transacciones) agotó el tiempo de conexión desde este entorno; `STOCKLY_POSTGRES_URL_NON_POOLING` (puerto 5432, pooler de sesión) sí conectó. Aunque el nombre diga "NON_POOLING", el host observado es un pooler, no la conexión directa a la base. El script de migración/verificación usa primero `STOCKLY_POSTGRES_URL_NON_POOLING`; la conexión de aplicación propuesta para P03 sigue siendo `STOCKLY_POSTGRES_URL` y se debe probar desde Next.js/Vercel.

`.env.local` y `.env*.local` están excluidos por `.gitignore`. Se deja constancia de que la persona usuaria confirmó que completó la rotación de credenciales, el cambio de contraseñas y la actualización de entornos; el contenido de dichos valores no se verificó ni se expone.

## 9. Estilos

- Tailwind CSS: no está instalado; los estilos existentes usan CSS global y módulos CSS.
- CSS global: `src/app/globals.css`.
- Fuente base: `Georgia`, con fallback `Times New Roman`, serif; no se encontraron fuentes descargadas/configuradas en el layout.
- Tokens CSS encontrados: `--ink`, `--muted`, `--line`, `--canvas`, `--white`, `--teal`, `--teal-soft`, `--coral` y `--amber`.
- Librería de íconos: no existe una dependencia identificable; se usan símbolos/texto y estilos propios.

## 10. Pruebas

Vitest `^5.0.0` está configurado en `vitest.config.ts`; hay pruebas en rutas API, `test/setup.ts` y `tests/reglas/`. Se ejecutan con `npm test` (`vitest run`) y `npm run test:ver` (modo interactivo).

## 11. Conflictos con el plan

- `src/app/panel/`: la interfaz se implementa en P06.
- `src/app/api/panel/sesion/route.ts`: creada en P03; las demás rutas del módulo se implementan en P05.
- `src/lib/dataService.ts`: conserva recuperación de cuentas y ahora reexporta los casos de uso P04.
- `src/components/ui/`: no existe.
- `src/app/page.tsx`: no es la plantilla de Next; redirige a `/login`.
- Las migraciones locales crean las tablas `productos`, `ventas`, `usuarios` y `eventos_inventario`; P01 verificó su aplicación en la base remota.

Actualización P01: la inspección remota confirmó que `public.users` existe con las columnas esperadas, el índice `users_email_lower_uidx`, la función `handle_auth_user_profile` y el trigger de Auth correspondiente. No se encontraron previamente `usuarios`, `productos`, `ventas`, `eventos_inventario`, `v_productos` ni `_migrations`. P01 registró la migración existente del login sin volver a ejecutarla y aplicó M1/M2; las pruebas de integridad terminaron con cero fallas.

## 12. Decisiones derivadas

- Ruta de login existente: `/login`.
- Protección: `src/proxy.ts` (Next.js 16); actualiza claims y protege `/panel/:path*` y `/api/panel/:path*`. El Proxy valida la sesión Supabase; las rutas de API también verifican que la cuenta tenga fila activa en `usuarios`.
- Migraciones: el mecanismo se creó en P01 (`scripts/migrar.mjs`, `scripts/verificar-bd.mjs`, `_migrations`). M1 y M2 están aplicadas en Supabase; la migración existente del login se registró sin reejecutarla tras verificar sus objetos.
- Variable de producción para `lib/db/conexion.ts`: `STOCKLY_POSTGRES_URL` (pooler de transacciones, puerto 6543). En desarrollo y scripts locales se usa `STOCKLY_POSTGRES_URL_NON_POOLING` (pooler de sesión, puerto 5432) porque el puerto 6543 agotó el tiempo de conexión desde este entorno; la conexión de sesión sí respondió `SELECT 1`. En producción se mantiene el pooler de transacciones. Los scripts de migración/verificación usan primero la variable del pooler de sesión.
- Vínculo login/Stockly (`auth_ref`): usar el UUID de Supabase Auth (`authData.user.id`/`auth.uid()`), que ya es la clave `id` de `public.users`. P03 consulta ese UUID en `usuarios.auth_ref`; no se usa el correo como clave de vínculo.
- Tabla preexistente `public.users`: no debe confundirse con la tabla `usuarios` que crea Stockly. Sus roles `admin/user` tampoco sustituyen los roles `dueno/trabajador`.
- Numeración propuesta para continuar el archivo actual:
  - M1: `20261031000100_stockly_tablas.sql`.
  - M2: `20261031000200_stockly_vista_seguridad.sql`.
- Prefijo de importación para `lib`: `@/lib/...`.
- Destino de login posterior a autenticación: P03 lo cambió de `/dashboard` a `/panel`, como indica el plan. La interfaz `/panel` se implementa en P06.
- Estado posterior a P01: tablas, vista, restricciones, índices únicos y RLS comprobados; P01 finalizó con cero fallas.

## 13. Compilación de base

Comando: `npm run build`.

Resultado: correcto. Next.js 16.3.5 compiló, completó TypeScript, generó 21 páginas estáticas y finalizó la optimización. Se listaron las rutas existentes, incluida `/dashboard` y `/api/panel/sesion`; la interfaz `/panel` se implementa en P06.
