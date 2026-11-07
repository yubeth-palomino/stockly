# Evolución comercial de Stockly

## Diagnóstico (2026-11-07)

Stockly usa Next.js App Router 16, TypeScript, PostgreSQL/Supabase Auth, `pg`,
Zod, CSS global y módulos CSS. El repositorio tiene capas de reglas, datos y
presentación, autenticación por roles y pruebas Vitest. No usa Tailwind, ni
incluye librerías de gráficos o exportación PDF/Excel.

La inspección de PostgreSQL se hizo con una transacción `READ ONLY`; no se
consultaron valores de filas. El esquema contiene `usuarios`, `productos`,
`ventas`, `eventos_inventario`, `v_productos`, `users`, `restablecimientos_contrasena`
y `_migrations`. Están registradas las tres migraciones existentes.

Agregados observados durante la prevalidación: 9 productos (8 activos), 3 ventas
y 14 eventos. Seis productos activos con existencias no tienen costo de compra
registrado. No se hallaron referencias con marca o descripción inconsistentes.
Estos datos solo describen el estado observado y no se usan como indicadores de
la aplicación.

## Hallazgos principales

1. `productos` representa inventario con clave única normalizada referencia +
   talla. No hay color, código de barras, catálogo de estilo ni stock por
   sucursal.
2. No existen empresas/sucursales, proveedores, compras, pagos, devoluciones,
   cambios ni gastos.
3. Las ventas actuales son registros de una sola referencia y cantidad. Guardan
   precio de venta del momento, pero no costo unitario del momento. La utilidad
   realizada usa el costo actual de `productos`; cambiar ese costo puede
   reescribir el resultado histórico.
4. `eventos_inventario` conserva eventos JSON, pero no garantiza cantidades
   anterior/nueva por evento; su FK original permite borrar eventos al borrar el
   producto.
5. `/panel` presenta indicadores reales básicos. La ruta legacy `/dashboard`
   contenía datos y controles de muestra; ya se sustituyó por un aviso sin
   métricas ficticias. La API JSON legacy `/api/data/[collection]` ahora exige
   administrador para leer y escribir, y queda deshabilitada en producción
   porque su JSON no representa el inventario PostgreSQL real ni serializa
   campos económicos por rol.
6. La autenticación Stockly (`dueno`/`trabajador`) coexiste con el subsistema
   legacy `admin`/`user`; se debe unificar o aislar antes de vender el producto.
7. El estado técnico previo tiene notas desactualizadas sobre scripts de
   migración y persistencia.

## Diseño acordado para preparar

- Multiempresa desde el modelo inicial, con sucursales y membresías/roles por
  empresa; acceso de trabajador limitado a sucursales asignadas.
- Catálogo por referencia y variante por talla/color; SKU y código de barras
  opcionales y únicos dentro de la empresa cuando estén definidos; el precio
  de venta vigente pertenece a la variante.
- Existencias y costo promedio ponderado por variante y sucursal.
- Costos de venta guardados en la línea al confirmar la operación; entradas,
  ventas, devoluciones y ajustes representados por movimientos append-only con
  usuario y cantidades anterior, delta y nueva. Las ventas, líneas y pagos son
  inmutables en base de datos; las correcciones requieren operaciones
  compensatorias.
- Proveedores y compras con detalle de cantidades y costo unitario; ventas con
  encabezado, múltiples líneas, descuentos y pagos; devoluciones/cambios ligados
  a líneas originales; gastos operativos.
- La empresa/sucursal inicial se crea como “por configurar”; no se inventa el
  nombre comercial del negocio.
- Cada venta existente se conserva y se copia a un documento/una línea histórica.
  Su costo unitario histórico queda `NULL`/`NO_REGISTRADO`, no se estima con el
  costo actual. El costo de apertura tomado del campo legado se marca sin
  validar; el dueño deberá reconciliarlo antes de tratarlo como base confiable
  para reportes financieros.
- Los eventos JSON originales se conservan; no se convierten en movimientos
  cuantitativos porque no todos garantizan cantidades anterior/nueva. El ledger
  propuesto empieza con un saldo de apertura fechado en la migración.
- Las tablas originales no se borran en esta expansión. El endpoint de datos
  JSON legacy y el dashboard demo necesitan una fase de endurecimiento aparte.

## Estado de la migración

El SQL de propuesta está en
`supabase/propuestas/20261107000100_evolucion_comercial.sql`. No está dentro de
`supabase/migrations`, por lo que `scripts/migrar.mjs` no lo ejecuta. Tampoco se
ha ejecutado SQL contra Supabase ni se ha creado un respaldo en esta fase. La
persona usuaria autorizó después las migraciones que sean seguras, pero aún no
hay una copia restaurable ni un entorno de staging confirmado.
La aplicación actual todavía escribe el inventario y las ventas en las tablas
legadas; por ello, no se debe aplicar esta expansión aisladamente. Primero debe
existir y probarse en staging la versión de aplicación que escribe las tablas
nuevas, y debe coordinarse el despliegue para evitar que ambas versiones
actualicen modelos distintos.

La expansión no tiene una reversión automática: después de registrar compras,
ventas o movimientos nuevos, borrar las tablas comerciales perdería historial.
Antes de habilitar escrituras, el rollback requiere restaurar el respaldo
verificado. Después de habilitarlas, una restauración previa podría perder
ventas recientes; se necesita recuperación puntual y reconciliación de esas
operaciones, no un `down` que elimine tablas. El esquema se trata como
migración forward-only y no se considera aprobado técnicamente hasta revisión
y ensayo en una base aislada.

Antes de trasladar la propuesta a migraciones:

1. Revisar el SQL y el modelo en staging con una copia protegida de la base.
2. Crear respaldo administrado en Supabase y un `pg_dump` formato custom cifrado
   fuera del repositorio. No imprimir URL, credenciales ni datos.
3. Verificar el respaldo con `pg_restore --list` y hacer una restauración de
   ensayo en una base aislada; confirmar tablas, conteos, claves foráneas,
   cantidades e importes agregados.
4. Acordar cómo se validarán los costos de apertura desconocidos y el nombre de
   la empresa inicial.
5. Ensayar primero en staging y, tras aceptación, aplicar en producción con el
   respaldo verificado. La persona usuaria ya autorizó las migraciones seguras;
   solicitar confirmación adicional solo si se detecta una operación que pueda
   alterar o eliminar datos reales irreversiblemente.

## Estado de implementación

La fase 1 local está completa. Se implementaron parcialmente en código las
reglas y rutas para listar variantes, crear catálogo/variantes, ajustar stock y
registrar ventas de múltiples líneas con descuentos y pagos. Las operaciones
validan membresía y sucursal en servidor; ajustes y ventas usan transacciones,
bloqueos, idempotencia y movimientos de inventario. La venta conserva el costo
unitario histórico solo cuando el costo de existencia está validado. Las rutas
devuelven 503 si falta el esquema comercial. No existe todavía una pantalla
que consuma estas rutas.

Las rutas no sustituyen aún los flujos legados de entrada y venta. No activar la
migración ni exponer estas rutas como flujo operativo hasta validar el SQL en
staging y completar la compatibilidad de las operaciones críticas.

## Fases de implementación

1. **Completada en código local:** quitar métricas/productos/actividad falsos del
   dashboard legacy; asegurar la API JSON (admin para lectura/escritura, sin
   caché) y responder 410 en producción para no presentar el archivo JSON de
   demostración como inventario real.
2. **Parcial local:** reglas, validaciones y endpoints para catálogo/variantes,
   consulta de inventario comercial y ajustes. Pendiente: integración de UI,
   pruebas transaccionales en PostgreSQL, revisión final de migración y ensayo
   en staging. No aplicar en producción hasta contar con código compatible y
   respaldo restaurable.
3. Implementar proveedores y compras; entrada de inventario y promedio
   ponderado dentro de transacciones.
4. **Parcial local:** servicio/ruta de ventas multi-línea, descuentos, pagos,
   costos históricos validados e idempotencia. Pendiente: UI, pruebas PostgreSQL
   y flujo completo de aceptación.
5. Implementar devoluciones/cambios y gastos.
6. Implementar alertas, estadísticas y reportes exportables. Solo usar datos
   persistidos; marcar explícitamente métricas sin costo validado.
7. Unificar permisos por empresa/sucursal, probar en staging los flujos
   trabajador/dueño y completar aceptación antes del despliegue productivo.

## Verificación conocida

El estado local actual pasó `npm run lint`, `npm run type-check`,
`npm test` (33 archivos, 130 pruebas) y `npm run build`. El SQL sigue siendo
solo una propuesta: no se aplicó en Supabase ni en otra base. No se creó ni
verificó respaldo; `pg_dump`, `pg_restore` y `psql` no están disponibles en
este entorno. Proveedores/compras, devoluciones/cambios, gastos, reportes,
alertas, dashboard comercial, integración de UI y aceptación integral siguen
pendientes. Esto no es una declaración de sistema completo.

## Auditoría funcional · 2026-11-07

Se observó en producción autenticada como dueño la carga de Resumen, Ventas y
Economía, y la lectura de inventario y usuarios. No se enviaron operaciones de
escritura. La página de Economía en producción mostró $450.000 de ganancia
realizada calculada con el costo actual; el código local fue corregido para no
mostrar ese cálculo sin costo histórico por venta. Debe desplegarse antes de
considerar resuelto el riesgo en producción.

La primera corrección local consultó las ventas comerciales con costo histórico,
pero una revisión de seguridad detectó que el resumen no tenía contexto de
empresa y podía sumar ventas de todos los tenants. Se retiró esa consulta: la
ganancia realizada queda no disponible hasta que el resumen reciba y valide una
empresa activa. No se deben agregar agregados multiempresa a esta vista.

También se observaron referencias `DEMO-*` en productos y usuarios con nombres
de prueba. No se eliminaron: se debe establecer si son datos de demostración
antes de cualquier limpieza. A 390 px, Economía pasó al diseño de tarjetas y
no mostró desbordamiento horizontal (375 px de contenido). El botón del menú
móvil no se pudo validar por timeout de la herramienta. Sin entorno de staging,
respaldos verificables, usuario trabajador y logs de servidor, siguen
pendientes las pruebas de punta a punta de ventas, entradas, permisos por rol y
persistencia.
