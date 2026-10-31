# Estado de ejecución · Stockly

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | completado | correcto | no ejecutados | 2026-10-31 |
| P01 Base de datos | pendiente | | | |
| P02 Reglas de negocio | pendiente | | | |
| P03 Servidor y roles | pendiente | | | |
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
- **Cierre:** pendientes resueltos en P01.

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
