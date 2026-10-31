# Fase 3 completada · Servidor, sesión con rol y primer dueño

Fecha: 2026-10-31

## Resultado

Se agregó la infraestructura del servidor Stockly sin cambiar el proveedor de autenticación ni almacenar contraseñas. La clave de vínculo `usuarios.auth_ref` es el UUID de Supabase Auth, igual al `id` de `auth.users`; el correo no se usa como vínculo.

La conexión de producción usa `STOCKLY_POSTGRES_URL` (pooler de transacciones, puerto 6543). Como ese puerto agotó el tiempo de conexión desde este entorno, el desarrollo local usa `STOCKLY_POSTGRES_URL_NON_POOLING` (pooler de sesión, puerto 5432), que respondió correctamente a `SELECT 1`. Migraciones y verificaciones también usan primero la variable del pooler de sesión.

## Validación automatizada

| Comando | Resultado |
|---|---|
| `npm test` | 20 archivos, 80 pruebas aprobadas |
| `npm run type-check` | Correcto |
| ESLint focalizado en archivos P03 | Correcto |
| `npm run build` | Correcto; compilación, TypeScript y rutas completados |

Vitest continúa mostrando la advertencia preexistente de `configLoader: 'native'`; no afecta las pruebas.

## Validación manual de autenticación

- `GET /api/panel/sesion` sin cookie: HTTP 401, `NO_AUTORIZADO`, `Cache-Control: no-store`.
- `GET /panel` sin sesión: HTTP 307 hacia `/login?next=%2Fpanel`.
- `GET /login`: HTTP 200.
- Se vinculó la cuenta autorizada como dueño mediante `npm run db:vincular-dueno`.
- En el navegador con sesión Supabase autenticada, `GET /api/panel/sesion`: HTTP 200; `datos.rol` fue `dueno` y `datos.nombre` coincidió con el nombre registrado. El nombre y el UUID no se guardan en este checkpoint.

## Resumen de cambios del login y protección

- `src/components/auth/LoginForm.tsx`: se cambió únicamente el destino posterior al login, de `/dashboard` a `/panel`.
- `src/lib/supabase/proxy.ts`: conserva la actualización de cookies/claims y expone si la sesión Supabase es válida.
- `src/proxy.ts`: agrega protección explícita para `/panel/:path*` y `/api/panel/:path*`; las páginas sin sesión redirigen a `/login` y las API responden 401 con el formato común, sin caché.
- `src/lib/auth/sesion.ts` y `/api/panel/sesion`: consultan `usuarios.auth_ref`, exigen una fila activa y devuelven el rol Stockly (`dueno` o `trabajador`).

## Alta del primer dueño

La persona dueña crea primero su cuenta en Supabase Auth y obtiene el UUID en **Authentication → Users → ID**. Desde la raíz del proyecto:

```powershell
npm run db:vincular-dueno -- "<UUID de Supabase Auth>" "<Nombre visible>"
```

El script es idempotente y nunca solicita credenciales. Para repetir el alta con la misma cuenta, se vuelve a ejecutar el comando.

## Altas antes de la pantalla Usuarios (P10)

Antes de P10, crea la cuenta de login en Supabase Auth, copia su UUID y ejecuta en el SQL Editor de Supabase una inserción con un nombre de usuario único:

```sql
INSERT INTO public.usuarios (auth_ref, nombre, usuario, rol, activo)
VALUES ('<UUID de Supabase Auth>', '<Nombre>', '<usuario_unico>', 'trabajador', true)
ON CONFLICT (auth_ref) DO NOTHING;
```

No agregues contraseñas a `usuarios`; el login existente las gestiona en Supabase Auth.
