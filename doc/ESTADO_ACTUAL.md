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
| pg | No existe |
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
│   └── 20261003000100_create_users_profiles.sql
└── restablecimientos_contrasena.sql

scripts/
└── tokenVercel.mjs

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
- Después de autenticar: `src/components/auth/LoginForm.tsx`, línea 51, reemplaza la ruta por `/dashboard`.
- Protección/proxy: `src/proxy.ts` exporta `proxy`; el matcher actual excluye recursos estáticos e imágenes y aplica al resto de rutas. `src/lib/supabase/proxy.ts` refresca la sesión, pero no exige autenticación ni protege rutas por rol.
- Cierre de sesión: POST `/api/auth/logout`, que llama `supabase.auth.signOut({ scope: 'local' })`; el botón navega a `/login`.
- Tabla de perfil existente en la migración local: `public.users`, columnas `id` (UUID, referencia a `auth.users.id`), `email`, `full_name`, `role` (`admin` o `user`), `created_at` y `updated_at`. No es la tabla `usuarios` requerida por el módulo Stockly.
- El estado de la base remota no se consultó; no se infiere que la migración local esté aplicada ni que la tabla remota tenga actualmente estas columnas.

## 6. Acceso a datos

- Clientes Supabase: `src/lib/supabase/server.ts` (cliente SSR), `src/lib/supabase/admin.ts` (cliente administrativo) y `src/lib/supabase/proxy.ts` (renovación de sesión).
- `src/lib/dataService.ts` ya existe y usa el cliente administrativo para recuperación de contraseñas y operaciones asociadas.
- `pg` no está declarado ni instalado; no existe archivo de pool/conexión `pg`.
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

Hay cadenas de conexión PostgreSQL configuradas en `.env.local`: `STOCKLY_POSTGRES_URL`, `STOCKLY_POSTGRES_URL_NON_POOLING` y `STOCKLY_POSTGRES_PRISMA_URL`. El archivo de ejemplo no incluye ninguna. La conexión de aplicación propuesta para P03 es `STOCKLY_POSTGRES_URL`; reservar `STOCKLY_POSTGRES_URL_NON_POOLING` para operaciones que requieran conexión directa si se confirma su modo en Supabase. No se inspeccionó ningún valor ni se confirmó el tipo de endpoint.

`.env.local` y `.env*.local` están excluidos por `.gitignore`. Se deja constancia de que la persona usuaria confirmó que completó la rotación de credenciales, el cambio de contraseñas y la actualización de entornos; el contenido de dichos valores no se verificó ni se expone.

## 9. Estilos

- Tailwind CSS: no está instalado; los estilos existentes usan CSS global y módulos CSS.
- CSS global: `src/app/globals.css`.
- Fuente base: `Georgia`, con fallback `Times New Roman`, serif; no se encontraron fuentes descargadas/configuradas en el layout.
- Tokens CSS encontrados: `--ink`, `--muted`, `--line`, `--canvas`, `--white`, `--teal`, `--teal-soft`, `--coral` y `--amber`.
- Librería de íconos: no existe una dependencia identificable; se usan símbolos/texto y estilos propios.

## 10. Pruebas

Vitest `^5.0.0` está configurado en `vitest.config.ts`; hay pruebas en rutas API y `test/setup.ts`. El comando configurado es `npm test` (`vitest run`).

## 11. Conflictos con el plan

- `src/app/panel/`: no existe.
- `src/app/api/panel/`: no existe.
- `src/lib/dataService.ts`: sí existe; su función actual está relacionada con recuperación de cuentas, no con el servicio de inventario del plan.
- `src/components/ui/`: no existe.
- `src/app/page.tsx`: no es la plantilla de Next; redirige a `/login`.
- En las migraciones locales no aparecen tablas `productos`, `ventas` ni `usuarios` del plan. La migración existente crea `public.users` para perfiles del login. No se consultó el esquema de la base remota, así que su estado no puede confirmarse.

## 12. Decisiones derivadas

- Ruta de login existente: `/login`.
- Protección: `src/proxy.ts` (Next.js 16); ya existe, conserva su matcher actual y hoy solo actualiza claims.
- Migraciones: no existe mecanismo local; P01 deberá crear `scripts/migrar.mjs` y la tabla de control que define el plan. La migración de perfil existente debe verificarse en Supabase antes de aplicarla o registrarla.
- Variable propuesta para `lib/db/conexion.ts`: `STOCKLY_POSTGRES_URL`. Está presente junto con variantes directas/Prisma; confirmar sus modos de conexión sin imprimir las URL. No es necesario pedir otra variable si la existente sirve para transacciones con `pg`.
- Vínculo login/Stockly (`auth_ref`): usar el UUID de Supabase Auth (`authData.user.id`/`auth.uid()`), que ya es la clave `id` de `public.users`. P03 deberá consultar ese UUID en `usuarios.auth_ref`; no usar el correo como clave de vínculo.
- Tabla preexistente `public.users`: no debe confundirse con la tabla `usuarios` que crea Stockly. Sus roles `admin/user` tampoco sustituyen los roles `dueno/trabajador`.
- Numeración propuesta para continuar el archivo actual:
  - M1: `20261031000100_stockly_tablas.sql`.
  - M2: `20261031000200_stockly_vista_seguridad.sql`.
- Prefijo de importación para `lib`: `@/lib/...`.
- Próximo destino de login: P03 cambiará `/dashboard` a `/panel`, como indica el plan; no se modifica en P00.

## 13. Compilación de base

Comando: `npm run build`.

Resultado: correcto. Next.js 16.3.5 compiló, completó TypeScript, generó 21 páginas estáticas y finalizó la optimización. Se listaron las rutas existentes, incluida `/dashboard`; no hay rutas `/panel`.
