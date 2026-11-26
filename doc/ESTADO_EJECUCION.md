# Estado de ejecución · Stockly

## Estado vigente · 2026-11-26

- Esta síntesis prevalece sobre las observaciones históricas que siguen en la bitácora.
- **Alcance:** P00–P11 son los prompts del documento rector; P12–P17 son fases de mejora registradas en `PLAN_MEJORAS.md` y sus checkpoints, no prompts de `PROMPTS_STOCKLY.md`. No se encontraron definiciones de P18 ni P19. La implementación técnica no equivale al cierre formal de un prompt cuando falta una verificación obligatoria.
- **Aceptación manual · 2026-11-26:** la persona usuaria confirma que realizó y acepta todas las verificaciones manuales pendientes. Se registran como **completadas según su aceptación**, incluidos P05, P07, P10/P11 y A-24–A-44. No se adjuntaron resultados o capturas por caso ni se verificaron independientemente en esta sesión; por eso el registro distingue aceptación de la usuaria de evidencia técnica comprobable.
- **Validación local de cierre:** `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run type-check` y `npm.cmd test` terminaron correctamente. Vitest pasó 64 archivos y 225/225 pruebas; las pruebas focalizadas del guard y registro pasaron 12/12. Una primera ejecución paralela sufrió timeouts por contención; la repetición aislada pasó completa. La advertencia `configLoader: 'native'` se eliminó al renombrar la configuración a `vitest.config.mts`.
- **Rediseño visual · 2026-11-26:** se centralizaron tokens y se actualizaron estilos de autenticación, componentes UI y panel. Login, registro y recuperación se capturaron en 390/1440 px; Playwright revisó las tres rutas en 360/390/768/1024/1440 px, sin desbordamiento horizontal ni errores de página. La persona usuaria confirma que realizó y acepta las verificaciones manuales, incluidas las visuales y físicas. No se adjuntaron evidencias por caso ni se verificaron independientemente en esta sesión. No se usó ni modificó ninguna base de datos durante esta actualización documental.
- **Fotografía de productos · 2026-11-26:** se agregó captura desde cámara y guardado privado en Supabase Storage, manteniendo aparte el escaneo de códigos. Las pruebas automatizadas pasaron. La persona usuaria informa que completó las pruebas físicas y que la función opera; no especificó entorno ni adjuntó evidencia de captura o persistencia para verificación independiente. En la comprobación anterior, la migración local `20261126000100_fotografias_productos.sql` no se había aplicado a ninguna base.
- **Aislamiento de staging (última verificación técnica):** las herramientas distinguen `VERCEL_ENV=preview` y requieren variables `STOCKLY_PREVIEW_*`. La verificación aislada del helper con `.env.local` confirmó que bloquea Production, sin imprimir valores. En esa verificación no se guardaron variables de Vercel, el CLI no tenía sesión y no había conexión local utilizable a `stockly-staging`; por ello no se ejecutaron `db:migrar`, `db:verificar`, `probar:flujo` ni `probar:comercial`. La persona usuaria reporta pruebas físicas completadas, pero no especifica el entorno ni el estado de migraciones; no se ha revalidado ese estado en esta actualización.
- **Base de producción:** revisión de solo lectura confirmó 14 migraciones registradas, incluida `20261115000100_multiempresa_registro.sql`, y las tablas `empresas`, `sucursales`, `empresas_usuarios` y `usuarios_sucursales`. No se aplicó SQL ni se modificaron datos.
- **Comparación de migraciones:** consulta de solo lectura comparó los 14 archivos SQL locales con `_migrations` en producción: 14/14 registrados, sin faltantes. `.env.local` apunta a Production; no se usó para migrar el staging.
- **Registro público:** el signup de Supabase y el proveedor Email están habilitados, con confirmación por correo activa. El error reportado coincide con una identidad que Supabase considera duplicada; no se verificó la dirección concreta ni se determinó si las variables de Vercel apuntan al mismo proyecto.
- **Dependencias:** `npm audit fix` sin `--force` actualizó el lockfile y redujo el reporte a 36 vulnerabilidades (1 crítica, 20 altas, 15 moderadas). Permanece crítica `tar`; la solución sugerida por npm requiere una actualización mayor de Vercel CLI y no se aplicó.
- **Correo:** `src/lib/correo.ts` usa `RESEND_FROM` en producción y rechaza el remitente de prueba; las pruebas locales cubren la selección y la respuesta del proveedor. No se envió ningún correo real. Para redeploy: confirmar dominio verificado en Resend; definir `RESEND_FROM` solo en el entorno Vercel requerido; confirmar que el conector/clave exista sin revelar su valor; desplegar; verificar el estado del deployment; probar, si se autoriza, solo con una dirección propia.
- **Aceptación manual:** la usuaria declara completadas y acepta las verificaciones manuales pendientes, incluidos A-01–A-19, A-21 y A-24–A-44. No se adjuntan resultados detallados por caso. El envío real de correo y el redeploy de `RESEND_FROM` no se consideran verificados por esta declaración, pues no se reportaron específicamente.

| Prompt                                   | Estado                                                                                            | Build                         | Tests                         | Fecha de evidencia |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- | --------------- |
| P00 Auditoría                            | completado                                                                                        | correcto                      | no ejecutados                 | 2026-10-31      |
| P01 Base de datos                        | completado                                                                                        | correcto                      | 0 fallas                      | 2026-10-31      |
| P02 Reglas de negocio                    | completado                                                                                        | correcto                      | 68/68                         | 2026-10-31      |
| P03 Servidor y roles                     | completado                                                                                        | correcto                      | 80/80                         | 2026-10-31      |
| P04 Datos                                | completado                                                                                        | correcto                      | 80/80                         | 2026-10-31      |
| P05 API                                  | implementación y verificación manual completadas según aceptación de usuaria; evidencia no adjunta | correcto                      | 84/84                         | 2026-11-26      |
| P06 Interfaz base y resumen              | completado                                                                                        | correcto                      | 84/84                         | 2026-10-31      |
| P07 Inventario                           | implementación y verificación manual de privacidad completadas según aceptación de usuaria; evidencia no adjunta | correcto                      | 98/98                         | 2026-11-26      |
| P08 Entrada de mercancía                 | completado                                                                                        | correcto                      | 98/98                         | 2026-11-07      |
| P09 Ventas                               | completado                                                                                        | correcto                      | 98/98                         | 2026-11-07      |
| P10 Usuarios y aceptación                | A-01–A-19 aceptadas como completadas por la usuaria; evidencia por caso no adjunta                  | correcto                      | 212/212                       | 2026-11-26      |
| P11 Módulo económico (opcional)          | implementación alineada con el plan; validaciones manuales aceptadas por la usuaria                 | correcto                      | 212/212                       | 2026-11-26      |
| P12 Auditoría y planificación de mejoras | auditoría/diseño cerrados; aprobación posterior para desarrollo de prueba registrada en PLAN_MEJORAS | correcto                      | 158/158                       | 2026-11-14      |
| Evolución comercial                      | implementada técnicamente en P13–P17; aceptación A-24–A-44 completada según usuaria, evidencia no adjunta | correcto                      | 212/212; comercial 14/14 en BD aislada (histórico) | 2026-11-26      |
| P13 Base de datos comercial              | migraciones verificadas en pruebas; registro y tablas comerciales confirmados en producción (solo lectura) | correcto                      | 212/212; BD aislada 0 fallas (histórico) | 2026-11-26      |
| P14 Servicios y API                      | reglas, transacciones, idempotencia y autorización implementadas; integradas contra BD de pruebas | correcto                      | 171/171                       | 2026-11-14      |
| P15 Caja, códigos y alertas              | vista de inventario actualizada; caja adaptable y detalle de cierres                              | correcto                      | 171/171                       | 2026-11-14      |
| P16 Proveedores, clientes y créditos     | páginas, API, saldos y abonos concurrentes; aceptación manual completada según usuaria              | correcto                      | 171/171                       | 2026-11-26      |
| P17 Dashboard y aceptación               | dashboard con series y filtros reales; A-24–A-44 aceptadas como completadas por la usuaria         | correcto                      | 171/171                       | 2026-11-26      |
| Pruebas físicas de cámara e impresión    | completadas y aceptadas por la usuaria; evidencia no adjunta ni verificada independientemente      | no aplica                     | confirmación de usuaria; sin artefactos | 2026-11-26 |
| Revisión funcional global                | automatización local aprobada; aceptación manual reportada completa; staging/correo no revalidados | correcto                      | 225/225; BD aislada 0 fallas, flujo 17/17 y comercial 14/14 históricos | 2026-11-26      |

### Cierre de la solicitud integral · 2026-11-26

- **Línea base:** build, lint, type-check y suite completa aprobados; Vitest 64 archivos/225 pruebas. La primera suite completa coincidió con lint y type-check y tuvo tres timeouts de pruebas y uno al iniciar un worker; la repetición independiente pasó 225/225. Las pruebas focalizadas de los cambios pasaron 12/12.
- **Protección de datos:** el helper cargado con `.env.local` informó que bloquea el destino Production. No se ejecutó SQL ni se invocaron scripts de base de datos; Production no recibió escrituras. No se ejecutaron integraciones o E2E por no disponer de conexión local a staging y cuentas autenticadas de prueba.
- **Staging/Preview:** los paneles web identifican el proyecto `stockly-staging` y el proyecto Vercel `stockly`; se abrió el formulario para variables Preview, pero no se guardó ninguna. Vercel CLI no está autenticado y no se dispone de las URL/credenciales de Postgres para correr las migraciones. Las 14 migraciones y las integraciones 17/17 y 14/14 registradas en secciones anteriores son resultados históricos, no evidencia de esta ejecución.
- **Cambios de código:** los scripts de escritura ahora validan el destino y bloquean Production; `/api/auth/register` registra solo metadatos de error permitidos y protege las tareas de reversión. Las pruebas locales cubren el bloqueo de Production, destinos discordantes y un error de Auth no duplicado sin incluir correo en los logs.
- **Dependencias:** `npm audit fix` sin `--force` actualizó `package-lock.json` y redujo el reporte de 50 a 36 vulnerabilidades: 1 crítica, 20 altas y 15 moderadas. La crítica restante es `tar`; la solución automática propone `vercel@67.0.0`, un salto mayor que no se aplicó. También queda `vercel` como dependencia directa con hallazgos altos transitivos.
- **Registro/correo:** la ruta de registro tiene pruebas unitarias de creación y reversión simuladas, pero no hubo prueba real de `/register`. `RESEND_FROM` es obligatorio en producción; se verificaron en código la selección del remitente y el fallo explícito ante ausencia, pero no se envió correo ni se confirmó un redeploy.
- **Rama y Preview:** los cambios se commitearon por separado y se hizo push únicamente a `agent/stockly-closure-2026-11-26`; no se hizo push a `main`. La página Deployments de Vercel permaneció en “Loading projects”, por lo que no se pudo confirmar el estado del Preview.
- **Cierre formal en esa ejecución (anterior a la aceptación reportada abajo):** P05 y P07 no se cerraron entonces sin una sesión real de trabajador y evidencia de 403/privacidad. P10 seguía abierto por aceptación A-01–A-19; P11 dependía del cierre de P10 y de A-21. P13–P17 son fases de mejora, no prompts, y su aceptación A-24–A-44 estaba pendiente en ese momento.

#### Checklist de redeploy para correo

1. Verificar en Resend que el dominio remitente esté verificado.
2. En Vercel, configurar `RESEND_FROM` únicamente en el entorno que se va a desplegar y confirmar el conector/`RESEND_API_KEY` sin copiar valores a logs o repositorio.
3. Confirmar que `APP_URL` y las URL de callback de Supabase apunten al dominio correcto.
4. Crear un deployment nuevo y comprobar que su estado sea listo.
5. Si se autoriza una prueba de entrega, enviarla solo a una dirección propia y guardar evidencia sin publicar la dirección ni secretos.

## Bitácora

### Preparación de Preview aislado · 2026-11-26 (intento anterior)

- **Aislamiento:** runtime y cliente administrativo de Supabase usan variables `STOCKLY_PREVIEW_*` únicamente en Vercel Preview; las herramientas de migración priorizan la URL no agrupada de staging cuando existe.
- **Verificación local:** 63 archivos y 218/218 pruebas aprobaron; `npm.cmd run build`, `npm.cmd run lint` y `npm.cmd run type-check` aprobaron. `git diff --check` no reportó problemas.
- **Pendiente:** Vercel todavía no tiene las variables exclusivas de Preview; no se aplicaron migraciones al proyecto staging y la aceptación manual sigue abierta. No se modificó Production ni se hizo push.

### Verificación del destino de migración · 2026-11-26 (intento previo)

- **Production:** la conexión configurada localmente identifica el proyecto `kzjvamlbbberhqdzqqhj`; una consulta de solo lectura confirmó las 14 migraciones locales ya registradas y ninguna pendiente. No se ejecutó el migrador en Production.
- **Staging:** el proyecto `stockly-staging` (`vmuwhxxdocujvbolrfhx`) sigue siendo el destino aislado para las aceptaciones; en ese intento el panel no terminó de cargar. La revisión de cierre posterior identificó el proyecto en el panel, pero no obtuvo una conexión PostgreSQL utilizable ni aplicó SQL.

### P12 · Auditoría y planificación de mejoras

- **Archivos creados:** `doc/PLAN_MEJORAS.md`, `doc/checkpoints/FASE_8_COMPLETADA.md`.
- **Archivos consultados:** `doc/PLAN_STOCKLY.md`, `doc/PROMPTS_STOCKLY.md`, `doc/ESTADO_ACTUAL.md`, `doc/ESTADO_EJECUCION.md`, `src/lib/reglas/`, `src/lib/datos/`, `src/app/api/panel/`, `src/app/panel/`, `src/components/panel/`, `src/lib/validacion/esquemas.ts`, `supabase/propuestas/20261107000100_evolucion_comercial.sql`.
- **Auditoría real:** el repositorio ya está funcional y con pruebas verdes; no se reescribió la autenticación ni se alteraron rutas productivas.
- **Decisiones clave:** variante/SKU como nivel de código de barras; caja separada entre efectivo y otros medios; ganancia solo si existe costo histórico confiable; proveedores no implican compras ni deuda sin evidencia real; los movimientos financieros conservan trazabilidad y responsable.
- **Verificación:** `npm test` terminó con 42 archivos y 158 pruebas aprobadas; `npm run build` compiló correctamente.
- **Límite del plan:** la migración estructural comercial queda suspendida hasta aprobación del responsable, respaldo de la base de pruebas y confirmación del ámbito de caja y del modelo de variantes.
- **Cierre:** al terminar P12, quedó cerrada la auditoría y el diseño, no la implementación comercial; en ese momento la aprobación de la siguiente etapa seguía pendiente. La aprobación posterior para desarrollar sobre la base de pruebas se registra en la sección 16 de `doc/PLAN_MEJORAS.md` y no implica autorización para modificar producción.

### P13–P17 · Mejoras comerciales · 2026-11-14

- **Decisiones aplicadas:** esquema legado sin empresa/sucursal; una caja global abierta; código único por producto; ventas y datos económicos sensibles visibles solo para dueño. La base usada fue la de desarrollo/pruebas confirmada previamente, no producción.
- **P13, migraciones:** se aplicaron `20261114000100_operaciones_comerciales.sql`, `20261114000200_idempotencia_caja.sql`, `20261114000300_cliente_venta.sql`, `20261114000400_indices_financieros.sql` y `20261114000500_vista_productos_campos_comerciales.sql`. Son aditivas; conservan filas legadas y no clasifican cobros históricos. La última migración sincroniza `v_productos` con `codigo_barras` y `stock_minimo` sin cambiar su seguridad `security_invoker`. `npm run db:verificar` aprobó tablas, RLS, índices, columnas y restricciones requeridas (0 fallas).
- **P14, API/datos:** se añadieron transacciones de ventas pagadas/a crédito, pagos reales, caja, directorios, cuenta por cobrar, abonos y dashboard. Claves idempotentes, bloqueo de saldo concurrente, una sola caja abierta e ingresos/egresos auditables. Se probó el rechazo a trabajador en rutas de caja/dashboard/directorios, cuentas y abonos, y en el servicio de venta con cliente/crédito.
- **P15, funciones compartidas:** se conservaron los códigos de barras/EAN y alertas existentes; se corrigió la selección por código. La caja separa efectivo y otros medios, entradas por ventas/abonos, movimientos manuales y detalle del cierre, con confirmación y bloqueo de egresos de efectivo excesivos.
- **P16, funciones de dueño:** clientes con historial de ventas, detalle de proveedores sin compras ficticias, crédito con pago inicial opcional, filtro de cuentas por cliente/fecha/estado y abonos parciales/finales con clave de reintento.
- **P17, dashboard:** consultas agregadas para ventas, pagos, créditos, abonos, saldos, stock y series diaria/semanal/mensual; rangos 7/30 días, mes, año y personalizado. Las ventas no clasificadas se cuentan, sin imputar método ni utilidad histórica.
- **Integración PostgreSQL:** `npm run probar:comercial` completó 14 comprobaciones en la base de pruebas: apertura concurrente, reintento de venta/abono/cierre, crédito, doble abono sobre saldo, rechazo de egreso, separación de efectivo/transferencia, detalle del cliente y conciliación básica del dashboard. Limpieza automática ejecutada; conteos de las nuevas tablas volvieron a cero.
- **Flujo heredado:** `npm run probar:flujo` completó 17/17 pasos. La ejecución inicial encontró que la vista `v_productos` no exponía las columnas comerciales; la migración anterior corrigió la causa. Se ajustaron las expectativas económicas del flujo al alcance vigente: los costos del trabajador se ocultan, inversión/ganancia potencial reflejan existencias actuales y la ganancia realizada histórica continúa sin calcularse por falta de costo por venta. Limpieza final: 3 ventas, 10 eventos, 3 productos y 1 usuario temporales eliminados.
- **Verificación final:** `npm test` pasó 52 archivos/171 pruebas; `npm run lint`, `npm run type-check` y `npm run build` terminaron correctamente. `npm run db:verificar` finalizó con 0 fallas, incluidas las columnas nuevas de `v_productos`. `npm run probar:comercial` completó 14/14 comprobaciones y limpió sus datos temporales.
- **Aceptación manual pendiente:** A-24–A-44 quedan vacíos en `doc/ACEPTACION_MEJORAS.md`. No se afirma aceptación visual, prueba de cámara/lector físico ni sesión real de trabajador.
- **Límites:** proveedores son catálogo; no existe compras/cuentas por pagar. Ventas históricas conservan método sin clasificar. Caja, directorios y panel financiero son exclusivos del dueño por la regla de confidencialidad del proyecto.
- **Cierre de fase:** la implementación y las pruebas de integración no sustituyen A-24–A-44. Estas fases quedan técnicamente implementadas, con aceptación manual abierta.

### Ajuste de migración para `stock_minimo` · 2026-11-14

- **Causa real:** la migración `20261107000500_stock_minimo_no_nulo.sql` imponía `NOT NULL` sobre `public.productos.stock_minimo` sin rellenar primero los registros existentes con valor `0`. La base conectada ya tenía filas con `NULL` y la migración fallaba de forma determinista.
- **Corrección aplicada:** se actualizó el SQL de la migración para ejecutar `UPDATE public.productos SET stock_minimo = 0 WHERE stock_minimo IS NULL;` antes de `ALTER COLUMN ... SET NOT NULL;`.
- **Resguardo de seguridad:** la migración comercial no aprobada `20261114000100_stockly_comercial_base.sql` se retiró de `supabase/migrations` y quedó como borrador en `supabase/propuestas/`, de acuerdo con la política del proyecto de no ejecutar SQL estructural sin aprobación y respaldo.
- **Verificación real:** `npm run db:migrar` completó la cola activa sin errores tras el ajuste; `npm run build` compiló correctamente y `npm test` terminó con 42 archivos y 158 pruebas aprobadas.

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
- **Estado del prompt:** no se cierra formalmente P05 hasta verificar con una sesión real de trabajador que la API responde 403 para usuarios y no serializa `precioCompra`; el checkpoint confirma que esa comprobación no se hizo.

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
- **P10 usuarios:** administración de cuentas Stockly para dueños, incluyendo invitaciones, cambio de rol/estado y protección del último dueño. En esa fase no se añadió registro público; el flujo público de creación de negocio y primera cuenta de dueño se incorporó posteriormente (ver actualización del 2026-11-21).
- **P11 economía:** módulo activado, captura de costo solo para dueño, validación de margen, resumen y desglose económico, incluyendo productos sin costo y ventas de productos agotados.
- **API y validación por rol:** las rutas POST/PATCH ahora usan esquemas distintos para dueño y trabajador; no aplican `.omit()` sobre un objeto Zod refinado. Las pruebas cubren la omisión de costos inválidos enviados por trabajadores.
- **Verificación local:** `npm run type-check`, `npm test` (26 archivos, 95/95), `npm run lint` y `npm run build` correctos. `npm run db:verificar`: 0 fallas. `npm run probar:flujo`: 17/17 pasos, 0 fallas; eliminó solo sus datos temporales `PRUEBA` (3 ventas, 10 eventos, 3 productos y 1 usuario).
- **Aceptación manual pendiente:** A-01 a A-23 permanecen sin resultado ni evidencia; no se verificó la sesión autenticada de trabajador ni la aceptación de ambos roles en Vercel. Completarla antes de declarar aprobada la aceptación de producción.
- **Aviso:** Vitest conserva la advertencia preexistente de `configLoader: 'native'`; no afecta las pruebas.
- **Estado de cierre:** P10 sigue pendiente por aceptación A-01–A-19. P11 quedó implementado técnicamente, pero se inició sin cumplir la precondición escrita de P11 (aceptación A-01–A-19 diligenciada); no se considera formalmente completado.

### Auditoría integral P00–P11 · 2026-11-07

- **Corrección monetaria:** los totales de línea se calculaban con multiplicación `number`, que puede redondear cuando precio y cantidad son enteros grandes válidos de PostgreSQL. Se agregó `totalLineaVenta()` con `bigint`, se usa en formulario, historial y detalle, y `formatearPesos()` rechaza números fuera del rango entero seguro. Se añadieron pruebas de cálculo exacto y formato.
- **Acceso a Usuarios:** un trabajador que entraba directamente a `/panel/usuarios` recibía un error de renderizado por la excepción de `exigirDueno()`. Ahora la página lo redirige a `/panel`; la API sigue respondiendo 403 para operaciones de trabajador.
- **Revisión estática:** rutas `/api/panel/*` llaman el guard correspondiente antes de leer parámetros o datos; los campos económicos se seleccionan por rol y Economía exige dueño; las consultas SQL usan parámetros y las interpolaciones restantes corresponden a fragmentos/columnas controlados por el código. No se encontraron archivos `.env.local` versionados ni valores de credenciales en archivos rastreados.
- **Verificación actual:** `npm test`: 27 archivos, 98/98 pruebas; `npm run build`, `npm run lint` y `npm run type-check`: correctos. `npm run db:verificar`: 0 fallas. `npm run probar:flujo`: 17/17 pasos, 0 fallas; limpieza final de solo sus datos temporales.
- **Alcance pendiente:** A-01 a A-23 siguen sin evidencia de ejecución autenticada en Vercel. P11 también exige como precondición la aceptación diligenciada; su implementación está lista, pero no se declara aceptación completa hasta que se cumpla esa precondición con dueño y trabajador reales.

### Aceptación autenticada en Vercel · avance 2026-11-07

- **Dueño:** sesión real confirmada en `/panel`; navegación muestra Usuarios y Economía. A-12 aprobado.
- **Fecha futura:** A-05 aprobado; la interfaz muestra rechazo en español y no envía la entrada.
- **Sin sesión:** A-18 aprobado mediante solicitud HTTP sin cookies (`/panel` redirige con 307 a `/login`). GET `/api/panel/economia` sin sesión devolvió 401, pero esto no sustituye la prueba A-19 como trabajador.
- **A-04 revalidado:** tras actualizar Vercel, cantidad cero sigue bloqueada y ahora aparece “La cantidad debe ser mayor que cero.”; no se envió el formulario. Caso aprobado y registrado en `doc/ACEPTACION.md`.
- **Flujo del dueño:** CAM001 se creó con 10 unidades a 60.000 y costo 30.000; la entrada `cam001`/`m` sumó 5 (15 en un solo producto). El intento de vender 20 fue bloqueado; la venta autorizada de 15 quedó registrada por 900.000 y agotó el producto. El intento de vender 1 adicional se bloqueó. El filtro “Solo disponibles” excluyó CAM001 tras actualizar la lista; luego se desactivó con cantidad 0.
- **Historial y Economía:** el historial muestra las tres ventas con fecha, precio unitario y total. CAM001 muestra costo 30.000, ganancia potencial 0 cuando agotado y venta de 15 a 60.000; Economía refleja inversión 0, potencial 0 y realizada 450.000, igual a `(60.000 − 30.000) × 15`.
- **CI:** el workflow de `9d7bee1` pasó `npm ci`, lint, type-check, tests y build en GitHub Actions. Las páginas autenticadas se renderizan en solicitudes para no requerir secretos de Supabase durante el prerender.
- **Pendiente:** quedan A-01, A-07, A-13 y A-19 por acceso de trabajador; A-14 no se intentó para no arriesgar el único acceso de dueño disponible; A-21 no se ejecutó porque requeriría modificar precio en producción; A-17 solo se comprobó tras navegar, no cerrar navegador/sesión. El filtro A-11 y las operaciones CAM001 se observaron en producción. La persona usuaria eligió continuar pruebas de dueño y dejar trabajador pendiente; no se solicitaron ni compartieron credenciales.

### Evolución comercial · diagnóstico y propuesta · 2026-11-07

- **Archivos preparados:** `doc/EVOLUCION_COMERCIAL.md` y `supabase/propuestas/20261107000100_evolucion_comercial.sql`.
- **Base inspeccionada:** únicamente agregados y esquema dentro de una transacción de solo lectura. Se observaron 9 productos, 8 activos, 3 ventas y 14 eventos; 6 productos activos con stock no tienen costo de compra. No se modificaron ni mostraron filas comerciales.
- **Diseño:** expansión aditiva con empresa/sucursal, membresías, catálogo/variantes, existencias con costo promedio, libro de movimientos, proveedores/compras, ventas con líneas/pagos, devoluciones y gastos; restricciones compuestas para impedir cruces entre empresas.
- **Resguardo:** la propuesta vive fuera de `supabase/migrations`; `scripts/migrar.mjs` solo ejecuta archivos de esa carpeta. No se ejecutó SQL ni se creó respaldo porque aún no hay aprobación para aplicar cambios estructurales. La documentación define los pasos de respaldo, restauración de ensayo y comparación requeridos antes de aplicar.
- **Historial:** no se inventan costos históricos de ventas ni movimientos previos; las ventas legadas quedan marcadas sin costo histórico y los eventos JSON existentes se conservan.
- **Fase 1 sin cambios de BD:** el dashboard legacy y la pantalla de login dejaron de mostrar cifras/productos/actividad de muestra. La API JSON legacy exige administrador, usa `Cache-Control: no-store` y responde 410 en producción porque lee un JSON de demostración, no el inventario real.
- **Verificación:** `npm run build`, `npm run lint` correctos; `npm test`: 29 archivos, 104/104 pruebas. El SQL no se ejecutó ni se conectó a la base; el diseño se revisó estáticamente. No se afirma que los módulos comerciales estén implementados.
- **Bloqueo de despliegue:** la aplicación actual todavía escribe en tablas legadas. No aplicar el SQL aislado; requiere versión compatible probada en staging y despliegue coordinado.

### Evolución comercial · reglas y API de inventario · 2026-11-07

- **Archivos creados:** `src/lib/reglas/comercial.ts`, `src/lib/datos/comercial.ts`, pruebas de reglas, servicio y rutas para inventario comercial y venta multiproducto.
- **Archivos creados adicionales:** endpoint y pruebas para venta comercial multiproducto con descuentos y pagos.
- **Archivos modificados:** validación Zod, catálogo de errores, `src/lib/dataService.ts`, SQL de propuesta (huella SHA-256 de idempotencia) y esta bitácora.
- **Implementado localmente:** normalización de referencia/talla/color/SKU/código de barras; creación transaccional de catálogo/variantes; listado filtrable con aislamiento empresa/sucursal; ajustes transaccionales con bloqueo de fila, costo promedio ponderado y ledger append-only; ventas con múltiples líneas, descuentos, pagos, control de existencias y copia de costo solo si está validado. Los movimientos de ajuste/venta son idempotentes. La disponibilidad del módulo se detecta explícitamente y responde 503 mientras falte el esquema.
- **Permisos y economía:** se comprueba la membresía activa y el acceso a sucursal en la capa de datos; costos solo se seleccionan para usuarios con rol dueño tanto en Stockly como en la empresa; creación y ajustes requieren dueño. No se usa un costo inicial importado que todavía no haya sido validado.
- **Validación:** `npm test` pasó 33 archivos y 130/130 pruebas; `npm run lint`, `npm run type-check` y `npm run build` correctos. Las pruebas del servicio simulan el cliente SQL; no sustituyen integración contra PostgreSQL.
- **Límites:** no se aplicó ni se probó la propuesta SQL en staging; no hay `pg_dump`/`pg_restore` disponibles en este entorno y no se confirmó conexión de staging ni respaldo restaurable. La UI todavía no consume estos endpoints; la huella SHA-256 debe probarse con la migración real. Compras/proveedores, devoluciones/cambios, gastos, reportes, alertas, dashboard comercial y aceptación integral siguen pendientes. No declarar el producto completo.

### Auditoría funcional integral · 2026-11-07

- **Alcance observado:** navegación autenticada de producción (Resumen, Inventario, Ventas, Usuarios y Economía), lectura de formularios/tablas/filtros y revisión de rutas/servicios/permisos/CSS responsive. No se enviaron mutaciones de negocio a producción.
- **Hallazgos corregidos y desplegados:** Economía calculaba la ganancia histórica con el costo actual de `productos`, que puede haber cambiado desde la venta, y la consulta comercial propuesta agregaba ventas sin limitarse a una empresa autorizada. Se eliminaron ambas inferencias: la ganancia realizada queda no disponible hasta tener contexto de empresa validado y costos por línea; la UI explica el motivo. Las ventas actuales no se alteraron. Tras el push, la página de producción mostró “No disponible” y la explicación correspondiente.
- **Hallazgos de funcionalidad:** compras/proveedores, devoluciones/cambios, reportes, gastos, alertas de bajo stock y UI para los endpoints comerciales todavía no existen. Los endpoints nuevos dependen de la migración pendiente. El historial de movimientos legado es JSON, no un ledger cuantitativo; las ventas legadas no guardan costo histórico.
- **Observación en producción:** el inventario y los indicadores se leen de PostgreSQL, pero los nombres `DEMO-*` observados en el inventario sugieren datos de demostración en la base conectada. No se borraron ni modificaron; hace falta confirmar si son datos reales o semilla antes de cualquier limpieza.
- **Pruebas del navegador:** se verificó render y navegación autenticada de dueño en páginas de lectura; a 390 px Economía cambió a tarjetas y el documento no tuvo desbordamiento horizontal (375 px de contenido frente a viewport de 390 px). El menú móvil abrió y cerró con teclado (Enter) y expuso sus enlaces; el clic automatizado por puntero agotó el tiempo esperando estabilidad antes de activarse, así que ese método queda sin validar. El navegador conservaba eventos previos de respuestas 401 y peticiones RSC abortadas durante navegación rápida; no se reprodujo error visible en las páginas cargadas. No se ejecutaron mutaciones productivas.
- **Pruebas locales de esta auditoría:** tras restringir el cálculo comercial sin empresa activa, `npm test` pasó 33 archivos y 130/130 pruebas; `npm run build`, `npm run type-check` y `npm run lint` correctos. GitHub Actions del commit `b9b9366` completó CI con éxito.

### Acceso de cuentas nuevas · 2026-11-21

- **Implementación:** el dueño crea la identidad en Supabase Auth y el perfil Stockly vinculado por `auth_ref` al enviar una invitación por correo. El callback admite enlaces de invitación y recuperación; la persona establece su contraseña antes de iniciar sesión con su correo.
- **Correo y errores:** se usa la plantilla de invitación existente de Resend. Si falla el envío, se intenta eliminar el perfil y la identidad recién creados y se informa el error. La producción requiere `RESEND_FROM` de un dominio verificado y la URL de callback permitida en Supabase.
- **Compatibilidad de pruebas:** `scripts/probar-flujo.ts` conserva su prueba de perfil vinculado mediante `crearUsuarioVinculado`, evitando generar invitaciones o enviar correos durante ese flujo.
- **Verificación:** `npm run build`, `npm run type-check`, `npm run lint` y `git diff --check` correctos; `npm test` pasó 55 archivos y 188/188 pruebas.
- **Pendiente manual:** no se envió una invitación real ni se verificó el inicio de sesión de una cuenta nueva en producción; requiere confirmar las variables y URLs de Supabase/Resend y probar el flujo extremo a extremo.
- **Límite de aceptación:** sin PostgreSQL aislado, restauración de respaldo, credenciales de trabajador ni logs del servidor, no se puede certificar compras/ventas/devoluciones, aislamiento multiempresa o errores backend de extremo a extremo. No declarar listo para producción.

### Auditoría restringida a entorno aislado · avance 2026-11-07

- **Preparación:** se creó la rama `audit/stockly` y se ignoraron `backup_datos.sql`/`backup_esquema.sql`. Los dumps fallaron porque Supabase CLI requiere Docker/Podman, no disponible; no se conectó ni modificó producción.
- **Línea base:** con URLs forzadas a `127.0.0.1`, `npm test` pasó 34 archivos/133 pruebas; lint, type-check y build pasaron. Se agregó una prueba de ruta de venta antes de cambios de negocio.
- **Corrección verificada:** el detalle de movimientos de un trabajador consultaba eventos de todos los usuarios mediante la conexión directa `pg`. Ahora la ruta entrega el ID autenticado y el servicio filtra los eventos por `usuario_id`; la prueba de regresión pasa.
- **Artefactos pendientes de validación:** se prepararon migraciones de RLS/RPC e invariantes SQL, pero no se aplicaron. `npx supabase@latest db lint --local` no pudo conectar a `127.0.0.1:54322` (`ECONNREFUSED`); no se ejecutaron invariantes, pruebas RPC, E2E ni Advisors.
- **Verificación actual:** `npm test` pasó 35 archivos/135 pruebas; `npm run lint`, `npm run build` y `npm run type-check` terminaron correctamente con URLs locales. Las operaciones de la aplicación aún usan escrituras SQL directas; la integración RPC y la aceptación completa permanecen pendientes. Estado: NO LISTO.

### Mejoras de interfaz, evolución, códigos de barras e inventario · avance 2026-11-07

- **Login y recuperación:** tema camel/beige, visibilidad de contraseña y estados accesibles; autenticación sin cambios. Browser local a 360/390/768/1024/1440 px en login y recuperación: sin scroll horizontal, botones de 52 px.
- **Evolución y etiquetas:** KPIs, series y desglose consultados/agregados en servidor; EAN-13 interno, lector/cámara cuando está disponible y etiquetas imprimibles. Tests unitarios para KPIs y verificación EAN.
- **Stock mínimo y Kardex:** dueño puede configurar el umbral; panel, badge de navegación y resaltado en inventario; historial con fecha/tipo y exportación CSV. Las rutas restringen los eventos del trabajador a los propios.
- **Exportaciones:** inventario y ventas CSV conservan filtros; el costo de compra solo aparece para el dueño. Se protegen celdas que podrían interpretarse como fórmulas.
- **Pruebas locales:** `npm run build`, `npm run type-check`, `npm run lint`, `git diff --check` correctos; `npm test`: 41 archivos, 153 pruebas aprobadas. Vitest emite la advertencia preexistente de `configLoader: 'native'`.
- **No verificado:** no hay PostgreSQL/Supabase local disponible (la URL de prueba es `127.0.0.1`; conexión local rechazada en intento previo). Migraciones, scripts de relleno, invariantes, consultas KPI frente a SQL manual, RPC, roles reales, Security/Performance Advisors y pantallas autenticadas responsive no se ejecutaron. No se conectó ni modificó producción.
- **Pendientes:** importación CSV con vista previa; fotos/Storage; conteo físico; cierre diario; filtros avanzados; análisis ABC/rotación; pulido integral/PWA. D1–D3 se consideran implementación parcial hasta probar migraciones y datos aislados. No declarar listo para producción.

### Corrección del inicio de sesión · 2026-11-07

- **Causa corregida:** el endpoint autenticaba contra Supabase Auth y después exigía un perfil de `public.users` (rol legacy), aunque el acceso real a Stockly depende de `public.usuarios`, `auth_ref`, `activo` y el rol `dueno|trabajador`. Esto podía aceptar una identidad que el panel no reconoce o bloquear una cuenta Stockly válida por faltar el perfil legacy.
- **Cambio:** login valida una sesión Supabase real y la fila activa en `usuarios`; cuenta ausente/inactiva o rol no válido revoca la sesión y presenta error. Fallo de BD responde 503 y revoca el inicio. Todas las respuestas evitan caché.
- **Navegación:** tras autenticarse se usa navegación completa del navegador para que la cookie recién emitida sea enviada en la siguiente petición; conserva destinos internos protegidos y rechaza redirecciones externas.
- **Pruebas focalizadas:** 2 archivos, 8 pruebas aprobadas; incluyen credenciales inválidas, sesión ausente, perfil inactivo/rol incorrecto, fallo BD y destino externo. `npm run lint` y `npm run type-check` correctos.
- **Límite:** no se probaron credenciales ni se conectó a Supabase real; el acceso real depende de que exista `usuarios.auth_ref = auth.users.id` con `activo = true`. El cambio está en `audit/stockly`; no está desplegado a producción.

### Rediseño integral de interfaz · 2026-11-14

- **Interfaz:** navegación lateral con accesos por rol, versión superior desplazable en móvil, encabezado de dashboard, cuatro indicadores con datos existentes, tarjetas pastel, pie de página y tipografías Poppins/Inter servidas con `next/font`.
- **Inventario:** buscador destacado con el filtro de referencia ya existente, acceso visual a agregar producto, tabla refinada y tarjetas adaptables en móvil. Los estados distinguen En stock, Stock bajo (cuando hay umbral configurado), Agotado e Inactivo.
- **Paleta:** fondo `#FAF6EF`, sidebar `#FFFDF8`, tarjetas blancas, bordes `#E8DDD0`, acentos beige y pasteles indicados.
- **Integridad de datos:** no se agregaron consultas, rutas ni reglas de negocio. El valor mostrado es la inversión existente, solo para dueños; trabajadores ven unidades disponibles. Si no se configuró el stock mínimo se indica “—”, no cero. No se inventó un conteo de “productos nuevos” porque el resumen actual no define un período para esa métrica; el cuarto indicador usa ventas reales de hoy.
- **Archivos modificados:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/panel/inventario/page.tsx`, `src/app/panel/layout.tsx`, `src/app/panel/page.tsx`, `src/components/panel/FiltrosInventario.tsx`, `src/components/panel/InsigniaDisponibilidad.tsx`, `src/components/panel/NavegacionPanel.tsx`, `src/components/panel/TablaInventario.tsx`, `src/components/panel/panel.module.css`, `src/components/ui/Insignia.tsx`, `src/components/ui/ui.module.css`.
- **Validación:** `npm run type-check`, `npm test` (52 archivos/172 pruebas), `npm run lint`, `npm run build` y `git diff --check` correctos. Vitest conserva su advertencia existente sobre `configLoader: 'native'`.
- **Alcance visual:** no se modificaron rutas, operaciones ni autenticación; se mantienen los accesos por rol y el filtro existente.

### Revisión integral · 2026-11-21

- **Resultado:** no se encontraron fallos de compilación, tipos, lint, reglas, rutas ni integridad de base de datos que requirieran correcciones.
- **Validación:** `npm run build`, `npm run lint`, `npm run type-check`, `npm test` y `npm run db:verificar` terminaron correctamente.
- **Pruebas:** Vitest aprobó 52 archivos y 172 pruebas; la verificación remota informó 0 fallas.
- **Ejecutación local:** Next.js inició en `http://localhost:3000`; `/login` respondió 200 y `/api/health` respondió 200 con estado `ok`; `/panel` conservó la protección y redirigió a `/login`.
- **Navegador:** la página de inicio de sesión se renderizó con su formulario, enlace de recuperación y control de visibilidad de contraseña.
- **Estado:** el repositorio no requirió cambios funcionales en esta revisión; se añadió únicamente la evidencia de la comprobación a esta bitácora.

### Corrección de recuperación y envío de correo · 2026-11-21

- **Causa:** la API de recuperación ignoraba el resultado `{ ok: false }` de Resend y respondía con el mensaje neutral incluso cuando el correo no se había enviado. En producción, el remitente predeterminado `onboarding@resend.dev` tampoco está habilitado para destinatarios arbitrarios.
- **Corrección:** producción ahora exige `RESEND_FROM` de un dominio verificado; el remitente de prueba queda solo para desarrollo. Los fallos del proveedor y de la solicitud se registran en el servidor sin incluir el correo del usuario; si el envío falla, se invalida el token recién creado. La respuesta pública sigue siendo neutral para no revelar si la cuenta existe.
- **Configuración pendiente para envío real:** definir `RESEND_FROM` en Vercel con una dirección de dominio verificado en Resend. La clave puede venir del conector de Vercel o de `RESEND_API_KEY`; `APP_URL` es opcional si Vercel ya publica la URL de producción correcta.
- **Verificación:** `npm test` pasó 53 archivos y 180 pruebas; `npm run build`, `npm run lint`, `npm run type-check` y `git diff --check` finalizaron correctamente. El primer type-check concurrente con el build encontró archivos `.next` mientras se regeneraban; la ejecución secuencial posterior pasó.

### Rediseño visual del panel · 2026-11-21

- **Cambios de estilo:** fondo lila, panel flotante blanco, sidebar marino de 180 px, tarjetas de resumen turquesa/moradas, tipografía Inter y controles redondeados. Se ajustaron los gráficos comerciales para usar morados.
- **Alcance:** solo CSS; se conservan rutas, nombres, funciones, acciones y datos reales. No se agregaron valores ficticios de ingresos/almacenamiento ni controles que no existían; la navegación móvil continúa en formato horizontal para mantener sus enlaces accesibles.
- **Archivos modificados:** `src/app/globals.css`, `src/components/panel/panel.module.css`, `src/components/panel/comercial.module.css`, `src/components/ui/ui.module.css`.
- **Verificación:** `npm run build`, `npm test` (55 archivos/188 pruebas), `npm run lint` y `git diff --check` correctos.
- **Revisión visual:** el navegador local agotó el tiempo al abrir `/panel`, así que no se pudo validar una captura en esta sesión.

### Rediseño visual del inicio de sesión · 2026-11-21

- **Cambios visuales:** formulario principal en una tarjeta blanca sobre fondo lila, panel marino con ilustración SVG, campos con iconos SVG, acentos morados/turquesa y diseño adaptable a celular.
- **Alcance:** solo presentación. Se conservan validaciones, estados, rutas, accesibilidad y flujos de inicio y recuperación; los estilos compartidos mantienen la coherencia visual en las pantallas de autenticación.
- **Archivos modificados:** `src/components/auth/LoginForm.tsx`, `src/components/auth/LoginForm.module.css`.
- **Verificación:** `npm run build`, `npm run type-check`, `npm run lint`, `npm test` (55 archivos/188 pruebas) y `git diff --check` correctos. No fue posible abrir el navegador de prueba porque falta Chromium de Playwright; no se instaló un navegador.

### Corrección de escaneo y acceso local · 2026-11-21

- **Escaneo:** la vista de video se comprobaba antes de montarse, por lo que la cámara nunca podía iniciar. Se mantiene el video montado, se usa ZXing cuando el navegador no ofrece `BarcodeDetector`, se liberan los controles al detener/desmontar y Enter del lector físico ya no envía el formulario antes de consultar el código.
- **Inicio de sesión local:** `next start` ejecuta con `NODE_ENV=production`; fuera de Vercel ahora selecciona `STOCKLY_POSTGRES_URL_NON_POOLING` si está configurada. En Vercel se conserva `STOCKLY_POSTGRES_URL` (pool de transacciones).
- **Verificación:** `npm run build`, `npm run type-check`, `npm run lint`, `npm test` (56 archivos/193 pruebas), `npm run db:verificar` (0 fallas), consulta PostgreSQL en modo producción local y `git diff --check` correctos. El escáner se probó con lector simulado; no se realizó una prueba física de cámara ni un inicio de sesión con credenciales reales.

### Corrección de impresión de etiquetas · 2026-11-21

- **Impresión:** el formato impreso ahora oculta la navegación y el encabezado del panel, elimina márgenes del contenedor y conserva solo las etiquetas seleccionadas. La hoja A4 usa tres columnas y las etiquetas individuales se separan por página de 50 × 30 mm.
- **Alcance:** solo impresión; se mantienen la selección de productos, cantidades, códigos de barras y precios.
- **Verificación:** `npm run build`, `npm run type-check`, `npm run lint`, `npm test` (56 archivos/193 pruebas) y `git diff --check` correctos. No se probó con una impresora física.

### Revisión funcional global y revalidación · 2026-11-21

- **Revalidación automatizada:** `npm run build`, `npm test` (56 archivos, 193 pruebas), `npm run lint`, `npm run type-check` y `npm run db:verificar` terminaron correctamente. La verificación de base de datos reportó 0 fallas. Vitest mostró su advertencia conocida sobre `configLoader: 'native'`, sin fallas.
- **Funciones comprobadas en código/pruebas:** autenticación Stockly y control de roles; recuperación y configuración de correo; inventario, ventas e información económica filtrada por rol; escaneo con ZXing como alternativa; impresión de etiquetas; caja, clientes, proveedores, crédito/abonos y dashboard.
- **Integraciones no reejecutadas:** `npm run probar:flujo` y `npm run probar:comercial` crean y eliminan registros temporales. No se ejecutaron en esta revisión porque antes debe confirmarse una base aislada de pruebas.
- **Aceptación manual pendiente:** en `doc/ACEPTACION.md` siguen pendientes A-01, A-07, A-13, A-14, A-17, A-19 y A-21; A-17 está parcial. En `doc/ACEPTACION_MEJORAS.md`, A-24–A-44 siguen sin resultado ni evidencia.
- **Límites de producción:** no se verificaron en vivo las cuentas dueño/trabajador, una invitación y correo real, configuración de Supabase/Resend, ni el despliegue actual de Vercel. Tampoco se validaron cámara/lector físico e impresora física.
- **Conclusión:** las comprobaciones automatizadas y de esquema están verdes, pero no equivalen a aceptación manual completa. No se certifica que todas las mejoras estén verificadas en producción ni se marca el proyecto como listo para producción.
- **Cambios de esta revisión:** solo se actualizó esta bitácora; no se modificó código funcional.

### Etiquetas, escaneo y dashboard comercial · 2026-11-21

- **Etiquetas:** se agregó el QR en SVG y se aisló `#print-area` al imprimir. La opción predeterminada es etiqueta térmica individual de 50 × 30 mm; se conserva el formato A4 y la impresión de varias etiquetas.
- **Escaneo:** se reutilizó `@zxing/browser` para QR, Code 128, EAN-13, EAN-8, UPC-A y UPC-E, con solicitud de cámara trasera, cierre de pistas y aviso de permiso. El inventario busca por código/referencia y permite abrir el producto coincidente. Se agregó `qrcode.react` para generar los QR de las etiquetas; no se instaló `html5-qrcode`.
- **Dashboard:** se agregaron los cuatro resúmenes requeridos, series semanales de ventas reales y una tabla de últimas ventas con precio unitario y usuario registrador. Los totales de hoy, semana y mes son independientes del rango seleccionado; las consultas son de lectura y no alteran el registro ni la lógica de ventas.
- **Verificación:** `npm run build`, `npm test` (61 archivos, 205 pruebas), `npm run lint`, `npm run type-check` y `git diff --check` pasaron. La instalación de `qrcode.react` informó 50 vulnerabilidades en el árbol de dependencias (23 moderadas, 25 altas y 2 críticas); no se ejecutó una actualización masiva de dependencias.
- **Límite de aceptación:** no se validó una cámara física en HTTPS/Safari ni una impresora térmica física; esas pruebas requieren el dispositivo y la selección del tamaño de papel correspondiente.

### Registro público y aislamiento por negocio · 2026-11-21

- **Registro:** se añadió `/register` con nombre, correo, contraseña visible/oculta y navegación recíproca con `/login`. El endpoint crea Auth y, en una transacción, un negocio vacío, sucursal principal, perfil de dueño y membresías; con sesión inmediata envía al panel y, si falta confirmación, informa revisar el correo.
- **Aislamiento:** los datos previos se asignan al negocio inicial; el negocio autenticado se obtiene del servidor y se propaga a consultas, escrituras, economía, movimientos y operaciones comerciales. Se añadieron relaciones/índices por empresa, políticas de lectura y claves de idempotencia compuestas, incluida la clave histórica `idempotency_key`.
- **Pruebas y documentación:** se agregaron pruebas del registro y de la reversión de Auth ante fallos transaccionales. `npm test` pasó 62 archivos/212 pruebas; `npm run type-check`, `npm run lint`, `npm run build` y `git diff --check` finalizaron correctamente.
- **Estado de migración actualizado 2026-11-26:** la migración `supabase/migrations/20261115000100_multiempresa_registro.sql` está registrada tanto en la base aislada como en el registro de producción. En la aislada, `npm run db:migrar` la omitió por aplicada y `npm run db:verificar` pasó con 0 fallas. La revisión de producción fue de solo lectura y confirmó las cuatro tablas multiempresa requeridas; no se ejecutó SQL ni se alteraron datos.
- **Pendiente de producción:** no hay evidencia de una migración de registro pendiente. Falta reproducir y diagnosticar el rechazo de `/register`, confirmar que las variables de Supabase en Vercel apuntan al proyecto revisado y probar la entrega y confirmación de correo con una cuenta de prueba.

### P10 · revalidación de cierre · 2026-11-25

- **Documentación:** se actualizó el README para reflejar el registro público de negocio/dueño añadido después de P10, y se aclaró que A-20 a A-23 se incorporaron con P11. Los checkpoints de fases 5 y 6 ya existían.
- **Ejecución del flujo:** se declaró `server-only` como dependencia directa y el script `probar:flujo` activa la condición `react-server`. Build, lint, tipos y pruebas siguieron correctos tras el cambio.
- **Verificación técnica:** `npm run build`, `npm run lint`, `npm run type-check` y `npm test` correctos; Vitest pasó 62 archivos y 212 pruebas. La advertencia de configuración `configLoader: 'native'` no afecta los resultados.
- **Privacidad:** `.env.local` está excluido de Git; la búsqueda de variables con valores en archivos rastreados no encontró coincidencias.
- **Prueba de integración bloqueada:** `npm run probar:flujo` se detuvo antes de conectarse porque Node no recibió `STOCKLY_POSTGRES_URL` ni `STOCKLY_POSTGRES_URL_NON_POOLING`. La limpieza no pudo ejecutarse; no se tocó ninguna base ni los datos DEMO.
- **Aceptación manual pendiente:** A-01, A-07, A-13, A-14, A-17 y A-19 requieren sesiones autenticadas y/o un entorno de prueba en Vercel. No se declaran aprobados ni se marca la aceptación de P10 como completa.

### P10–P17 · estado técnico y seguimiento de aceptación · 2026-11-26

- **P10:** usuarios, invitaciones, cambio de rol/estado y protección del último dueño quedan implementados y cubiertos por pruebas; la aceptación autenticada A-01, A-07, A-13, A-14, A-17 y A-19 permanece pendiente.
- **P11:** por decisión de la persona usuaria del 2026-11-26, `obtenerEconomia` calcula la ganancia realizada usando el precio de compra actual del producto, como indican `PLAN_STOCKLY.md` §9 y P11 de `PROMPTS_STOCKLY.md`. La métrica histórica del dashboard comercial conserva el costo guardado al vender y se documenta como distinta en `PLAN_MEJORAS.md` §4.4. P11 sigue sin cumplir su precondición: `doc/ACEPTACION.md` no está diligenciado para A-01–A-19; A-21 y la verificación con trabajador siguen pendientes. P11 no se considera formalmente cerrado.
- **Corrección P11:** `obtenerEconomia` ahora une ventas con su producto y usa `productos.precio_compra`; las ventas cuyo producto no tiene costo aportan cero. La interfaz advierte que modificar el costo actual recalcula ventas anteriores.
- **P12:** auditoría y planificación comercial documentadas; no corresponde una migración adicional.
- **P13–P17:** base comercial, servicios/API, caja, directorios/crédito/abonos y dashboard quedan implementados según sus checkpoints. A-24–A-44 siguen siendo aceptación manual y no se consideran aprobados.
- **Migración multiempresa:** en la base aislada, `npm run db:migrar` omitió las 14 migraciones y `npm run db:verificar` terminó con 0 fallas. Una revisión de solo lectura de producción confirmó 14 entradas en `_migrations`, incluida `20261115000100_multiempresa_registro.sql`, y las cuatro tablas multiempresa. No se aplicó SQL en producción.
- **Cierre de código:** `npm run build`, `npm run lint`, `npm run type-check` y `npm test` terminaron correctamente; Vitest pasó 62 archivos y 212 pruebas en la ejecución final.
- **Revalidación de esta corrección:** `npm test -- src/lib/datos/economia.test.ts` pasó 3/3; `npm run build`, `npm test` (62 archivos, 212/212), `npm run lint` y `npm run type-check` pasaron. Solo persiste la advertencia conocida de configuración de Vitest.
- **Revalidación con variables configuradas:** `npm run db:verificar` terminó con 0 fallas; `npm run probar:flujo` completó 17/17 pasos y limpió sus datos; `npm run probar:comercial` completó 14/14 comprobaciones.
- **Correcciones adicionales:** se incluyó `empresa_id` en las inserciones de verificación, la limpieza eliminó dependencias comerciales antes de ventas/usuarios y el flujo dejó de depender de cookies de una petición HTTP al ejecutar servicios directos.
- **Sesión en despliegue:** se observó GET `/api/panel/sesion` con respuesta 401 `NO_AUTORIZADO` y el navegador quedó en `/login`; no se logró comprobar la sesión de dueño declarada por la persona usuaria ni iniciar una sesión trabajador. La aceptación autenticada A-01–A-23 queda sin cerrar.
- **Hardware:** la persona usuaria informó que cámara/lector e impresora están disponibles, pero todavía no se ha capturado lectura ni impresión como evidencia. A-24–A-44 requieren verificación visual/hardware; no se marcan aprobados por pruebas automatizadas.
- **Correspondencia con prompts:** la tabla inicial distingue a partir de esta revisión implementación técnica, precondiciones y verificaciones manuales requeridas; no se deduce cierre formal solo por tener pruebas verdes.

### Revisión de faltantes y estado de invitaciones · 2026-11-25

- **Cierre técnico:** P00–P17 tienen implementación y pruebas automatizadas registradas; `npm run build`, `npm run lint`, `npm run type-check` y `npm test` pasaron en la última revalidación. Las integraciones de flujo y comercial pasaron contra la base aislada de pruebas, no contra producción.
- **Aceptación P10/P11 pendiente:** A-01, A-07, A-13, A-14, A-17 y A-19 requieren una sesión real de trabajador, una invitación de prueba o un entorno seguro. A-21 requiere probar el rechazo de precio con datos de prueba; no debe alterarse un precio real en producción. A-17 aún no incluye cerrar navegador/sesión.
- **Aceptación P13–P17 pendiente:** A-24–A-44 siguen sin resultado manual. Incluyen códigos de barras/lector, mínimos y alertas, caja, proveedores/clientes/crédito, permisos de trabajador y conciliación del dashboard. Cámara/lector e impresora fueron reportados disponibles por la persona usuaria, pero falta probarlos y guardar evidencia física.
- **Producción de registro público:** la migración multiempresa consta en el registro de producción y las tablas requeridas existen, confirmado mediante consultas de solo lectura. No se hizo respaldo ni se modificó la base. El error de registro no se explica por una migración pendiente; falta verificar el correo intentado en Authentication > Users (sin compartirlo), comparar las variables de producción de Vercel con el proyecto y probar el flujo y la entrega del correo. La confirmación por correo está activa; la entrega SMTP real no se ha probado.
- **Invitaciones de trabajador:** el conector Resend de Vercel existe y `getToken('stockly')` coincide con su identificador. Se agregó `RESEND_FROM` únicamente al entorno Production. El redeploy sigue pendiente de completar la verificación de identidad solicitada por Vercel; mientras no haya un nuevo despliegue listo, la configuración aún no está activa en producción. No se envió una invitación real ni se creó una cuenta de prueba.
- **Estado de cambios:** esta revisión actualizó documentación únicamente; no cambió código ni hizo push. No se repitieron build ni pruebas por ser un cambio documental.

### Revalidación automatizada y estado de cierre · 2026-11-25

- **Build:** `npm run build` terminó correctamente con Next.js 16.3.5; se generaron las rutas estáticas y dinámicas sin errores.
- **Calidad y tipos:** `npm run lint` y `npm run type-check` terminaron correctamente.
- **Pruebas unitarias:** `npm test` aprobó 62 archivos y 212/212 pruebas. Persiste solo la advertencia conocida de Vite sobre `configLoader: 'native'`.
- **Integración con PostgreSQL aislado:** con confirmación de que `.env.local` apunta a la base aislada, `npm run db:verificar` terminó con 0 fallas; `npm run probar:flujo` pasó 17/17 y limpió 3 ventas, 10 eventos, 3 productos y 1 usuario temporales; `npm run probar:comercial` pasó 14/14 y limpió sus datos de prueba. `STOCKLY_PRUEBA_COMERCIAL=SI` se definió solo para ese proceso.
- **Producción:** el despliegue activo observado sigue en el commit `879fde5`. `RESEND_FROM` está configurado solo para Production, pero la página compartida de Vercel todavía muestra la verificación de identidad sin completar; no se confirmó un nuevo despliegue ni se probó una invitación real.
- **Criterio de cierre a esa fecha:** la compilación, lint, tipos y pruebas unitarias estaban verdes. En ese momento seguían pendientes la aceptación autenticada, la verificación de migraciones de producción, pruebas físicas A-24–A-44 y despliegue de la configuración de correo. La revisión posterior de solo lectura confirmó el registro de migraciones en producción; continúan pendientes aceptación, correo real y despliegue de `RESEND_FROM`.

### Registro público en producción · 2026-11-25

- **Destino:** se confirmó que `supabase-amber-diamond` (`kzjvamlbbberhqdzqqhj`) es el proyecto de producción de Stockly.
- **Migraciones:** el registro de producción contiene 14 entradas, incluida `20261115000100_multiempresa_registro.sql`; existen `empresas`, `sucursales`, `empresas_usuarios` y `usuarios_sucursales`. No hay una migración de registro pendiente que explique el rechazo actual. No se modificó la base.
- **Supabase Auth:** «Allow new users to sign up» y el proveedor Email están habilitados; «Confirm email» también está activo. La consulta agregada encontró dos identidades Auth y ninguna sin perfil Stockly.
- **Síntoma:** `/register` carga con HTTP 200. La persona usuaria reporta «No fue posible crear la cuenta con esos datos. Verifica el correo o inicia sesión». El endpoint devuelve ese texto cuando Supabase señala una identidad duplicada (`email_exists`/`user_already_exists` o identidades vacías), antes de crear negocio o perfil. Es una respuesta genérica de privacidad; no se consultaron ni registraron correos. En la ventana de logs de Vercel inspeccionada no apareció un `POST` de registro.
- **Siguiente paso:** comprobar en Authentication > Users, sin compartir la dirección, si el correo intentado ya aparece. Si aparece, usar inicio de sesión o recuperación de contraseña; si no aparece, verificar que las variables Supabase de Production en Vercel apunten a este proyecto y revisar el registro del intento.
- **Respaldo:** el plan Free de Supabase no incluye respaldos programados; no se creó un respaldo. Como no se ejecutó SQL ni hay migración pendiente de registro, no se necesitó restaurar datos. Para futuras migraciones sigue haciendo falta un respaldo descargable verificable.

### Pulido visual de registro · 2026-11-26

- **Nota histórica:** el alcance limitado a registro de esta entrada fue reemplazado por el rediseño visual integral descrito a continuación.
- **Presentación:** se modernizó `/register` con fondo suave, tarjeta dividida y panel de marca con acentos decorativos, además de ajustes en campos, botones y enlace secundario.
- **Alcance:** solo estilos y una clase para aislarlos en el registro. Se conservaron la estructura del formulario, validaciones, estados, rutas y comportamiento; el inicio de sesión y las demás pantallas de autenticación no reciben estos estilos.
- **Verificación visual local:** revisado en escritorio y en móvil (390 × 844); se corrigió el diseño de una columna en anchos móviles.
- **Verificación automatizada:** `npm run lint`, `npm run type-check`, `npm test` (63 archivos, 218 pruebas), `npm run build` y `git diff --check` correctos. Vitest conserva su advertencia conocida sobre `configLoader: 'native'`.
- **Despliegue:** no se hizo commit ni push; el cambio aún no está publicado en Vercel.

### Rediseño visual integral · 2026-11-26

- **Sistema visual:** se conservaron los colores de Stockly y se definieron tokens compartidos de color, espaciado, tipografía Inter, radios, sombras y altura de controles; se unificaron estilos UI, autenticación, navegación y módulos principales del panel.
- **Autenticación:** login, registro y recuperación comparten composición, campos, botones, foco visible y escalas tipográficas. Se conservaron textos, validaciones, rutas y estados.
- **Panel:** se actualizaron la navegación lateral/responsiva, encabezados, indicadores, formularios, tablas y tarjetas móviles. Los CSS no alteran rutas, permisos, funciones, filtros, exportaciones, privacidad por rol ni el montaje del vídeo de cámara. No se modificaron las reglas de impresión de `#print-area`, A4 ni formato térmico.
- **Capturas:** antes y después de login, registro y recuperación, en `doc/diseno/antes/` y `doc/diseno/despues/`, a 390 y 1440 px. No se generaron capturas con datos ficticios.
- **Verificación visual:** 15 combinaciones de ruta y viewport público (360, 390, 768, 1024 y 1440 px) respondieron HTTP 200 sin scroll horizontal ni errores de página; la captura final incluye solo las tres rutas públicas. Tab en login verificó el foco visible en sus controles.
- **Pendiente de sesión aislada:** todas las rutas de panel probadas llevan a `/login` sin sesión. Sin cuenta de prueba y base aislada disponibles, no se verificaron capturas ni teclado en panel autenticado ni la cámara física. La persona usuaria reporta que la impresión funciona, pero no se inspeccionó su vista previa en esta sesión. La automatización de esta tarea no equivale a aceptación visual manual del panel.
- **Validación local:** `npm.cmd run lint`, `npm.cmd run type-check`, `npm.cmd test` (64 archivos, 225/225 pruebas), `npm.cmd run build` y `git diff --check` correctos. No se conectó a bases de datos.
- **Rama:** `diseno/ui-moderna`; cambios separados en commits por área y publicados en `origin/diseno/ui-moderna`. No se hizo push a `main`.

### Captura fotográfica de productos · 2026-11-26

- **Comportamiento:** se añadió un obturador para tomar una fotografía JPEG con la cámara trasera en el formulario de entrada; el navegador limita el lado mayor a 1600 px. La fotografía es opcional, se previsualiza antes del envío y se asocia al producto creado o a la entrada sumada.
- **Persistencia y privacidad:** la migración añade `foto_path` y crea el bucket privado `stockly-productos` con límite de 3 MB y MIME JPEG. Las rutas requieren sesión, comprueban el negocio del producto y devuelven una URL firmada de 60 segundos; el path no se serializa al cliente. El registro sin foto conserva compatibilidad con el esquema anterior.
- **Escaneo existente:** `EscanerCamara` sigue leyendo QR/EAN/UPC en vivo; no se modificó ni se convirtió en cámara fotográfica.
- **Pruebas:** pruebas focalizadas 14/14; suite completa `npm.cmd test` (66 archivos, 233/233); `npm.cmd run lint`, `npm.cmd run type-check`, `npm.cmd run build` y `git diff --check` correctos.
- **Estado de la verificación técnica anterior al reporte:** en esa sesión no se aplicó la migración ni se escribieron datos; la cámara física no se validó. Para replicar la prueba en Preview, se requiere `20261126000100_fotografias_productos.sql` en `stockly-staging` y `STOCKLY_PREVIEW_SUPABASE_SERVICE_ROLE_KEY`; la persona usuaria reporta después haber completado las pruebas físicas, sin indicar si usó ese entorno.

### Aceptación manual reportada · 2026-11-26

- **Estado:** la persona usuaria declara que completó y acepta todas las verificaciones manuales pendientes, incluidas las aceptaciones P05/P07, A-01–A-19, A-21 y A-24–A-44, además de las pruebas físicas de cámara e impresión. El estado se registra como **completado según aceptación de la usuaria**.
- **Alcance de la evidencia:** no se adjuntaron resultados o capturas por caso, URL/entorno probado ni registros de HTTP. La aceptación es de la usuaria; no se presenta como verificación técnica independiente de sesiones, privacidad, almacenamiento, migraciones o impresión.
- **Estado formal:** P05, P07, P10 y P11, junto con la aceptación comercial P13–P17, quedan aceptados por la usuaria según su declaración. La tabla distingue este cierre de la evidencia automatizada disponible.
- **Pendientes fuera de esta aceptación:** no se revalidaron el entorno de staging, las migraciones, el envío real de correo ni el redeploy de `RESEND_FROM`; el mensaje no especifica esos resultados.
- **Seguridad:** esta actualización solo documenta la aceptación; no realizó escrituras a bases de datos ni cambios en producción.
