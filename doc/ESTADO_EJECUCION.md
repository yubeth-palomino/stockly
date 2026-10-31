# Estado de ejecución · Stockly

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | completado | correcto | no ejecutados | 2026-10-31 |
| P01 Base de datos | completado | correcto | 0 fallas | 2026-10-31 |
| P02 Reglas de negocio | completado | correcto | 68/68 | 2026-10-31 |
| P03 Servidor y roles | completado | correcto | 80/80 | 2026-10-31 |
| P04 Datos | pendiente | | | |
| P05 API | pendiente | | | |
| P06 Interfaz base y resumen | pendiente | | | |
| P07 Inventario | pendiente | | | |
| P08 Entrada de mercancía | pendiente | | | |
| P09 Ventas | pendiente | | | |
| P10 Usuarios y aceptación | pendiente | | | |
| P11 Módulo económico (opcional) | pendiente | | | |

## Bitácora

### P00 · Auditoría

- **Archivos creados:** `doc/ESTADO_ACTUAL.md`, `.github/copilot-instructions.md`, `doc/ESTADO_EJECUCION.md`, `doc/checkpoints/FASE_0_COMPLETADA.md`.
- **Archivos modificados:** ninguno.
- **Comandos y resultados:** revisión de estructura, `package.json`, migraciones y nombres de variables sin valores; `npm run build` terminó correctamente con Next.js 16.3.5.
- **Problemas/resolución:** el esquema remoto y el modo de conexión asociado a las URL Postgres no se verificaron. Se documentó la limitación sin leer ni imprimir credenciales.
- **Cierre:** P01 confirmó el estado remoto y creó las migraciones Stockly.

### P01 · Base de datos del módulo

- **Archivos creados:** `supabase/migrations/20261031000100_stockly_tablas.sql`, `supabase/migrations/20261031000200_stockly_vista_seguridad.sql`, `scripts/db-client.mjs`, `scripts/migrar.mjs`, `scripts/verificar-bd.mjs`, `doc/checkpoints/FASE_1_COMPLETADA.md`.
- **Archivos modificados:** `package.json`, `doc/ESTADO_ACTUAL.md`, `.github/copilot-instructions.md`, `doc/ESTADO_EJECUCION.md`.
- **Comandos y resultados:** `npm run db:migrar` registró la migración previa de perfiles sin reejecutarla y aplicó M1/M2. `npm run db:verificar`: 0 fallas. `npm run build`: correcto.
- **Problemas/resolución:** `STOCKLY_POSTGRES_URL` en el puerto 6543 agotó el tiempo de conexión desde este entorno y `pg` interpretaba el parámetro TLS del URL por encima de `rejectUnauthorized: false`. Se añadió `scripts/db-client.mjs` para configurar host/credenciales/TLS por separado y se usó `STOCKLY_POSTGRES_URL_NON_POOLING`, que en Supabase corresponde al pooler de sesión en el puerto 5432. La conexión de aplicación por el pooler de transacciones queda pendiente de validar en P03.
- **Migración previa:** se confirmó `public.users` y sus objetos del login (índice, función y trigger Auth); se registró `20261003000100_create_users_profiles.sql` en `_migrations` sin volver a ejecutarla.
- **Salida resumida de verificación:** existen las cuatro tablas y `v_productos`; índices únicos requeridos presentes; RLS activo en las cuatro tablas; inserción normalizada correcta; duplicado, cantidad inválida, precio inválido y rol inválido rechazados con las restricciones esperadas; disponibilidad pasa a falsa con cantidad cero; total de fallas 0. Las pruebas terminaron en ROLLBACK.
- **Pendientes:** en P03 comprobar conectividad del pooler de transacciones desde la aplicación y Vercel.

Salida de `npm run db:verificar`:

```text
OK existencia usuarios
  filas usuarios: 0
OK existencia productos
  filas productos: 0
OK existencia ventas
  filas ventas: 0
OK existencia eventos_inventario
  filas eventos_inventario: 0
OK existencia v_productos
OK índice ux_productos_ref_talla
OK índice ux_usuarios_usuario
OK RLS usuarios
OK RLS productos
OK RLS ventas
OK RLS eventos_inventario
OK producto CAM001 insertado y normalizado
OK referencia/talla duplicadas normalizadas
OK cantidad negativa
OK precio de venta cero
OK rol de usuario no permitido
OK vista indica no disponible con cantidad cero
Total de fallas: 0
```

### P02 · Reglas de negocio y pruebas unitarias

- **Archivos creados:** `src/lib/config/stockly.ts`, `src/lib/reglas/{errores,fechas,roles,producto,venta,economia}.ts`, `tests/reglas/{ayudas,producto,venta,fechas,roles,economia}.test.ts`, `doc/checkpoints/FASE_2_COMPLETADA.md`.
- **Archivos modificados:** `vitest.config.ts`, `package.json`, `doc/ESTADO_ACTUAL.md`, `doc/ESTADO_EJECUCION.md`.
- **Comandos y resultados:** `npm exec vitest run tests/reglas`: 5 archivos, 32 pruebas aprobadas. `npm test`: 17 archivos, 68 pruebas aprobadas. `npm run build`: correcto; TypeScript y compilación completados.
- **Problemas/resolución:** se conservó la selección de pruebas API existente junto con `tests/**/*.test.ts`; las suites existentes también pasan usando environment Node. Vitest emite una advertencia ya presente sobre `configLoader: 'native'`, sin afectar build ni pruebas.
- **Economía:** se implementaron fórmulas puras y validación para T-24 a T-32; el módulo económico sigue desactivado y estas funciones no están conectadas a la aplicación.
- **Pendientes:** ninguno identificado.

### P03 · Servidor, sesión con rol y primer dueño

- **Archivos creados:** `src/lib/db/conexion.ts`, `src/lib/auth/sesion.ts`, `src/lib/http/respuestas.ts`, `src/lib/validacion/esquemas.ts`, `src/lib/formato.ts`, `src/app/api/panel/sesion/route.ts`, `scripts/vincular-dueno.mjs`, pruebas en `tests/servidor/`.
- **Archivos modificados:** `src/proxy.ts`, `src/lib/supabase/proxy.ts`, `src/components/auth/LoginForm.tsx`, `package.json`, `doc/ESTADO_ACTUAL.md`.
- **Comandos y resultados:** `npm test`: 20 archivos y 80 pruebas aprobadas; `npm run build`: correcto; `npm run type-check`: correcto; ESLint focalizado: correcto. GET `/api/panel/sesion` sin sesión respondió 401 con `NO_AUTORIZADO` y `Cache-Control: no-store`; `/panel` redirige a `/login`.
- **Conexión:** el pooler de transacciones `STOCKLY_POSTGRES_URL` (6543) agotó el tiempo de conexión desde este entorno. `STOCKLY_POSTGRES_URL_NON_POOLING` (pooler de sesión, 5432) respondió `SELECT 1`; se usa esta URL solo en desarrollo local. Producción mantiene el pooler de transacciones.
- **Vínculo de identidad:** `usuarios.auth_ref` usa el UUID de la cuenta en Supabase Auth, no el correo. El script de alta idempotente requiere ese UUID y un nombre; no solicita ni guarda contraseñas.
- **Alta y verificación manual:** se ejecutó `npm run db:vincular-dueno` para vincular la cuenta autorizada. Sin sesión, GET `/api/panel/sesion` devolvió 401 y `NO_AUTORIZADO`; con la sesión Supabase autenticada, respondió 200 con el nombre de la cuenta y `rol: "dueno"`.
- **Checkpoint:** `doc/checkpoints/FASE_3_COMPLETADA.md`.
