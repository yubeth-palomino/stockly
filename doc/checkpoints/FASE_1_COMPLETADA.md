# Fase 1 completada · Base de datos Stockly

Fecha: 2026-10-31

## Migraciones

Comando: `npm run db:migrar`

```text
20261003000100_create_users_profiles.sql: registrada como existente (sin volver a ejecutarla)
20261031000100_stockly_tablas.sql: aplicada
20261031000200_stockly_vista_seguridad.sql: aplicada
```

Se verificó que el perfil Supabase existente `public.users` tenía las columnas y objetos de la migración de login. No existían previamente las tablas Stockly, su vista ni la tabla de control `_migrations`. La migración de login se registró sin ejecutarla de nuevo.

## Verificación de base de datos

Comando: `npm run db:verificar`

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
Restricciones productos/ventas: [{"tabla":"productos","nombre":"productos_cantidad_valida","tipo":"c"},{"tabla":"productos","nombre":"productos_pkey","tipo":"p"},{"tabla":"productos","nombre":"productos_precio_compra_valido","tipo":"c"},{"tabla":"productos","nombre":"productos_precio_venta_valido","tipo":"c"},{"tabla":"productos","nombre":"productos_referencia_minima","tipo":"c"},{"tabla":"productos","nombre":"productos_talla_minima","tipo":"c"},{"tabla":"ventas","nombre":"ventas_cantidad_positiva","tipo":"c"},{"tabla":"ventas","nombre":"ventas_pkey","tipo":"p"},{"tabla":"ventas","nombre":"ventas_precio_positivo","tipo":"c"},{"tabla":"ventas","nombre":"ventas_producto_id_fkey","tipo":"f"},{"tabla":"ventas","nombre":"ventas_usuario_id_fkey","tipo":"f"}]
Índices requeridos: [{"tabla":"productos","nombre":"ux_productos_ref_talla","definicion":"CREATE UNIQUE INDEX ux_productos_ref_talla ON public.productos USING btree (clave_referencia, clave_talla)"},{"tabla":"usuarios","nombre":"ux_usuarios_usuario","definicion":"CREATE UNIQUE INDEX ux_usuarios_usuario ON public.usuarios USING btree (lower(btrim((usuario)::text)))"}]
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

Todas las pruebas de integridad ocurrieron dentro de una transacción que terminó con `ROLLBACK`; no dejaron filas de prueba.

## Build y conexión

- `npm run build`: correcto.
- Migraciones/verificación usan `STOCKLY_POSTGRES_URL_NON_POOLING`, que se confirmó como pooler de sesión en puerto 5432. `STOCKLY_POSTGRES_URL` (pooler de transacciones, puerto 6543) agotó el tiempo de conexión desde este entorno; debe verificarse desde la aplicación en P03.
