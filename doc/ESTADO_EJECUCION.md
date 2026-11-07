# Estado de ejecución · Stockly

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | completado | correcto | no ejecutados | 2026-10-31 |
| P01 Base de datos | completado | correcto | 0 fallas | 2026-10-31 |
| P02 Reglas de negocio | completado | correcto | 68/68 | 2026-10-31 |
| P03 Servidor y roles | completado | correcto | 80/80 | 2026-10-31 |
| P04 Datos | completado | correcto | 80/80 | 2026-10-31 |
| P05 API | completado | correcto | 84/84 | 2026-10-31 |
| P06 Interfaz base y resumen | completado | correcto | 84/84 | 2026-10-31 |
| P07 Inventario | completado | correcto | 98/98 | 2026-11-07 |
| P08 Entrada de mercancía | completado | correcto | 98/98 | 2026-11-07 |
| P09 Ventas | completado | correcto | 98/98 | 2026-11-07 |
| P10 Usuarios y aceptación | implementación completada; aceptación manual pendiente | correcto | 98/98 | 2026-11-07 |
| P11 Módulo económico (opcional) | implementación completada; aceptación manual pendiente | correcto | 98/98 | 2026-11-07 |

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

### P04 · Datos: usuarios, inventario y ventas

- **Archivos creados:** `src/lib/datos/{tipos,eventos,usuarios,productos,ventas,resumen,economia,conexion}.ts`, `scripts/limpiar-prueba.mjs`, `scripts/probar-flujo.ts`, `scripts/cargar-demo.ts`.
- **Archivos modificados:** `src/lib/dataService.ts` (se conservaron las funciones existentes de recuperación), `src/lib/db/conexion.ts` (selección del pooler de sesión para comandos locales), `package.json`, `package-lock.json`, `doc/ESTADO_ACTUAL.md`.
- **Flujo real:** `npm run probar:flujo`: 13/13 pasos OK, total de fallas 0. Se verificaron normalización/re-stock, errores de entrada y venta, filtrado de disponibilidad, ocultamiento de precio de compra al trabajador, ventas, precio copiado, edición de producto, usuario duplicado y protección del último dueño. Limpieza final: 2 ventas, 6 eventos, 1 producto y 1 usuario de prueba eliminados.
- **Datos demo:** `npm run db:demo` cargó 8 productos de distintas marcas/tallas y registró 2 ventas que dejaron 2 productos agotados.

Salida de `npm run db:demo`:

```text
Ventas eliminadas: 0
Eventos eliminados: 0
Productos eliminados: 0
Usuarios eliminados: 0
referencia  talla  cantidad  disponible
DEMO-001    S      12        Sí
DEMO-002    M      8         Sí
DEMO-003    30     6         Sí
DEMO-004    32     5         Sí
DEMO-005    L      0         No
DEMO-006    M      10        Sí
DEMO-007    L      4         Sí
DEMO-008    34     0         No
```

- **Resumen comprobado en la base:** 8 productos activos, 45 unidades disponibles, 2 productos agotados y 2 ventas de hoy. Para trabajador, las filas no contienen `precioCompra`; para dueño, aparece `precioCompra: null`. `npm run db:verificar`: total de fallas 0; RLS, índices únicos y restricciones siguen correctos.
- **Validación automatizada:** `npm run build`, `npm test` (20 archivos, 80 pruebas), `npm run type-check` y ESLint focalizado completados correctamente.
- **Fase:** P04 dejó la fase 4 abierta hasta P05; con P05 completado, la fase queda cerrada.

### P05 · API con control por rol

- **Archivos creados:** `src/app/api/panel/resumen/route.ts`, rutas de productos (`route.ts`, `[id]/route.ts`, `[id]/desactivar/route.ts`), ventas y usuarios (`route.ts`, `[id]/route.ts`), además de pruebas de rutas para productos y usuarios.
- **Protección y validación:** todos los handlers exigen sesión Stockly; usuarios y desactivación de productos exigen dueño. Cuerpos y filtros se validan con los esquemas Zod existentes, los UUID se validan y las respuestas usan `Cache-Control: no-store`. Entradas/ventas retornan 201.
- **Sin sesión:** GET `/api/panel/resumen`, GET `/api/panel/productos` y POST `/api/panel/ventas` respondieron 401 (`NO_AUTORIZADO`).
- **Dueño con sesión real:** GET `/api/panel/productos` respondió 200 con 8 productos e incluyó `precioCompra`; GET `/api/panel/usuarios` respondió 200 con 1 usuario.
- **Trabajador:** pruebas de rutas verifican 403 al consultar usuarios y que el rol trabajador se pasa al servicio de inventario, que serializa omitiendo `precioCompra`. No se usó una sesión real de trabajador en esta comprobación.
- **Checkpoint:** `doc/checkpoints/FASE_4_COMPLETADA.md`.

### Revalidación de P01–P05 · 2026-11-06

- **Pruebas y compilación:** `npm test`: 23 archivos y 87/87 pruebas aprobadas; `npm run build` y `npm run type-check`: correctos.
- **P01:** `npm run db:verificar` terminó con 0 fallas; confirmó tablas, índices, RLS y restricciones. Las inserciones de prueba se revirtieron con `ROLLBACK`.
- **P02:** la suite completa aprobó las pruebas de reglas de negocio.
- **P03:** las rutas de sesión, resumen, productos y usuarios y el POST de ventas respondieron 401 sin sesión en el servidor local. La comprobación previa de sesión real de dueño está documentada en P03; no se simuló ni creó una sesión real de trabajador.
- **P04:** `npm run probar:flujo` completó 13/13 pasos; verificó entradas, ventas, stock, roles y datos históricos. Antes de ejecutarlo se confirmó que no había registros `PRUEBA` existentes; la limpieza final eliminó solo los datos temporales del flujo.
- **P05:** la suite verificó las restricciones de rol y el servicio de inventario; las rutas locales sin sesión respondieron 401. La verificación con sesión real de dueño y la limitación de la sesión de trabajador constan arriba y en `doc/checkpoints/FASE_4_COMPLETADA.md`.
- **Aviso de herramientas:** Vitest emitió una advertencia de configuración `configLoader: 'native'`; no afectó las pruebas.

### P06 · Interfaz base, navegación y resumen

- **Archivos creados:** `src/components/ui/` (botón, campo, selector, tarjeta, insignia, aviso, modal y estado vacío), `src/components/panel/` (navegación por rol e insignias), `src/app/panel/layout.tsx` y `src/app/panel/page.tsx`.
- **Archivos modificados:** `src/app/globals.css` (tokens visuales preservando el login) y `src/app/page.tsx` (redirección a `/panel`).
- **Acceso:** el layout valida el usuario; sin perfil Stockly, pero con sesión Auth, informa que la cuenta necesita alta y ofrece cerrar sesión; sin sesión redirige al login. La navegación muestra Usuarios solo al dueño y Economía solo con el módulo activado.
- **Resumen real:** con usuario dueño y datos DEMO aparecen 8 productos activos, 45 unidades, 2 agotados y 2 ventas de hoy. Se muestran enlaces a detalle y accesos rápidos para registrar entrada y venta.
- **Móvil:** comprobado en navegador a 390×844; el menú inicia cerrado, se despliega al activarlo, muestra Usuarios al dueño y omite Economía porque P11 está desactivado.
- **Validación automatizada:** `npm test`: 22 archivos, 84/84 pruebas aprobadas; `npm run type-check`, ESLint focalizado, Prettier y `npm run build` correctos.

### P07–P11 · Inventario, operaciones, usuarios y economía · 2026-11-07

- **P07 inventario:** filtros sincronizados con URL, listado adaptable, detalle e historial; edición y desactivación restringidas al dueño. La serialización por rol omite los campos económicos para trabajadores.
- **P08 entrada:** formulario validado, fecha Bogotá, normalización, re-stock y actualización de costo exclusiva del dueño. Los esquemas de trabajadores descartan `precioCompra` incluso cuando llega inválido.
- **P09 ventas:** búsqueda, confirmación, verificación transaccional de stock e historial filtrable con el precio de venta histórico.
- **P10 usuarios:** administración de cuentas Stockly para dueños, incluyendo cambio de rol/estado y protección del último dueño. El alta de identidad se realiza primero en Supabase Auth; el login no se reescribió ni se añadió registro público.
- **P11 economía:** módulo activado, captura de costo solo para dueño, validación de margen, resumen y desglose económico, incluyendo productos sin costo y ventas de productos agotados.
- **API y validación por rol:** las rutas POST/PATCH ahora usan esquemas distintos para dueño y trabajador; no aplican `.omit()` sobre un objeto Zod refinado. Las pruebas cubren la omisión de costos inválidos enviados por trabajadores.
- **Verificación local:** `npm run type-check`, `npm test` (26 archivos, 95/95), `npm run lint` y `npm run build` correctos. `npm run db:verificar`: 0 fallas. `npm run probar:flujo`: 17/17 pasos, 0 fallas; eliminó solo sus datos temporales `PRUEBA` (3 ventas, 10 eventos, 3 productos y 1 usuario).
- **Aceptación manual pendiente:** A-01 a A-23 permanecen sin resultado ni evidencia; no se verificó la sesión autenticada de trabajador ni la aceptación de ambos roles en Vercel. Completarla antes de declarar aprobada la aceptación de producción.
- **Aviso:** Vitest conserva la advertencia preexistente de `configLoader: 'native'`; no afecta las pruebas.

### Auditoría integral P00–P11 · 2026-11-07

- **Corrección monetaria:** los totales de línea se calculaban con multiplicación `number`, que puede redondear cuando precio y cantidad son enteros grandes válidos de PostgreSQL. Se agregó `totalLineaVenta()` con `bigint`, se usa en formulario, historial y detalle, y `formatearPesos()` rechaza números fuera del rango entero seguro. Se añadieron pruebas de cálculo exacto y formato.
- **Acceso a Usuarios:** un trabajador que entraba directamente a `/panel/usuarios` recibía un error de renderizado por la excepción de `exigirDueno()`. Ahora la página lo redirige a `/panel`; la API sigue respondiendo 403 para operaciones de trabajador.
- **Revisión estática:** rutas `/api/panel/*` llaman el guard correspondiente antes de leer parámetros o datos; los campos económicos se seleccionan por rol y Economía exige dueño; las consultas SQL usan parámetros y las interpolaciones restantes corresponden a fragmentos/columnas controlados por el código. No se encontraron archivos `.env.local` versionados ni valores de credenciales en archivos rastreados.
- **Verificación actual:** `npm test`: 27 archivos, 98/98 pruebas; `npm run build`, `npm run lint` y `npm run type-check`: correctos. `npm run db:verificar`: 0 fallas. `npm run probar:flujo`: 17/17 pasos, 0 fallas; limpieza final de solo sus datos temporales.
- **Alcance pendiente:** A-01 a A-23 siguen sin evidencia de ejecución autenticada en Vercel. P11 también exige como precondición la aceptación diligenciada; su implementación está lista, pero no se declara aceptación completa hasta que se cumpla esa precondición con dueño y trabajador reales.
