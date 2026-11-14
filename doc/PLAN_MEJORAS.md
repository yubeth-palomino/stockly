# Stockly · Plan de mejoras y auditoría comercial

## 1. Objetivo y alcance

Este documento consolida la auditoría de la base funcional actual y el diseño preliminar para la ampliación comercial prevista en la fase P12, sin introducir cambios de esquema ni de código en la aplicación sin una aprobación explícita.

### Alcance confirmado por la auditoría real

La base del proyecto ya incluye:

- autenticación con Supabase Auth y protección de rutas `/panel` y `/api/panel`
- tabla Stockly `usuarios` con roles `dueno` y `trabajador`
- CRUD de productos, inventario y ventas del módulo base
- validación con Zod y reglas de negocio puras en `src/lib/reglas/`
- servicio de datos y API protegidas por sesión/rol
- módulos de economía, evolución y circuito comercial avanzado de diagnóstico, no desplegado en producción

El objetivo de la ampliación no es reemplazar estas piezas ni introducir otra arquitectura. La integración debe ser aditiva y respetar la estructura actual.

## 2. Estado real detectado

### Estructura relevante que existe

- `src/lib/reglas/`: reglas puras de producto, ventas, fechas, roles, economía y errores.
- `src/lib/datos/`: consultas y transacciones de Stockly.
- `src/lib/db/conexion.ts`: conexión con PostgreSQL y transacciones.
- `src/lib/validacion/esquemas.ts`: validación de entradas y permisos.
- `src/app/api/panel/`: rutas protegidas para sesión, resumen, inventario, productos, ventas y usuarios.
- `src/app/panel/`: layout autenticado, resumen, inventario, ventas y gestión de usuarios.
- `src/components/panel/`: componentes reutilizables de inventario, búsqueda, venta, usuario y etiqueta.
- `src/lib/reglas/comercial.ts` y `src/lib/datos/comercial.ts`: reglas y servicios para inventario comercial emitidos por la auditoría del repositorio.
- `src/lib/datos/evolucionVentas.ts`: métricas de evolución y dashboard analítico.
- `supabase/propuestas/20261107000100_evolucion_comercial.sql`: diseño de expansión para empresas/sucursales, catálogo/variantes, proveedores, cuentas por cobrar y pagos.

### Evidencia funcional verificada

Se ejecutaron las comprobaciones reales sin modificar datos de producción:

- `npm test` → 42 archivos, 158 pruebas aprobadas.
- `npm run build` → compilación exitosa de Next.js 16.3.5.
- `npm run type-check` y `npm run lint` no presentan fallos en la base funcional actual.

La validación anterior confirma que los cambios de mejora deben integrarse sobre una base funcional y no como reemplazo de la arquitectura actual.

## 3. Decisiones funcionales por rol

### 3.1 Funciones para dueño y trabajador

#### Códigos de barras

- El código identifica la unidad vendible real: SKU o variante, no una referencia genérica.
- La implementación debe asociarlo al nivel que represente la variante comercial efectiva y no compartir un mismo código entre variantes distintas.
- El flujo debe soportar:
  - lectura manual por teclado
  - lectura por lector compatible
  - lectura por cámara cuando el navegador lo permita
  - impresión de etiqueta
  - validación de códigos duplicados y desconocidos
- La lectura de cámara no debe activarse automáticamente; solo tras interacción con el usuario.

#### Alertas de stock bajo

- El sistema debe calcular el estado desde la cantidad disponible real y el mínimo configurado.
- Debe distinguir `normal`, `bajo` y `agotado`.
- Toda alerta debe derivarse de existencias reales; no de caches ni datos stale.

#### Caja del día

- Debe existir un concepto de caja abierta/cerrada por ámbito definido por la operación real (tienda, sucursal, terminal o usuario).
- La caja separa efectivo físico de otros medios de pago.
- Los ingresos de ventas a crédito no se suman como efectivo recibido.
- Los abonos sí forman parte de caja solo cuando se recibe efectivo o transferencia real y se asocian al medio correcto.

### 3.2 Funciones exclusivas del dueño

- Proveedores con listado, alta, edición, activación, desactivación y observaciones.
- Clientes con historial de ventas y saldo pendiente.
- Ventas a crédito y cuentas por cobrar.
- Abonos parciales y cierre del saldo.
- Dashboard financiero con ventas, métodos de pago, pendientes y productos con stock bajo/agotado.

## 4. Decisiones contables y de negocio obligatorias

### 4.1 Código de barras

El código no representa una categoría ni una referencia sin diferenciar variantes. Si el modelo actual expresa cada talla/color/variante como un registro independiente, el código debe asociarse a esa variante. Si el modelo no lo hace, hay que introducir la entidad SKU/variante antes de continuar. No puede haber un código ambiguo compartido por varias variantes.

### 4.2 Caja y ventas a crédito

- Las ventas registradas no equivalen automáticamente a ingreso en caja.
- Una venta a crédito debe aumentar la cuenta por cobrar, no el efectivo físico.
- Un abono sí entra a caja por el monto realmente recibido y por medio de pago.
- No debe duplicarse el movimiento si la venta ya produjo un ingreso automático.

### 4.3 Métodos de pago

La caja debe diferenciar:

- efectivo
- transferencia
- tarjeta
- otros medios

El saldo esperado de efectivo debe operar sobre la suma de apertura + entradas de efectivo - egresos de efectivo, no sobre todos los medios mezclados.

### 4.4 Ganancias y utilidad

No se debe llamar “ganancia” a las ventas como tal. La utilidad debe mostrarse solo cuando exista:

- costo histórico confiable
- asociación real a la venta o a la línea vendida
- escenario válido para la empresa o sucursal

Si no hay costo histórico fiable, la UI debe mostrar “ventas” o “valor vendido” y una nota de limitación.

### 4.5 Proveedores

Registrar un proveedor no equivale a inventar una compra ni una deuda. Solo se muestran compras, costos o cuentas por pagar cuando existe evidencia real en la base.

### 4.6 Integridad financiera

Cada movimiento financiero debe conservar:

- responsable
- fecha y hora
- operación de origen
- medio de pago
- referencia a venta/abono/egreso
- trazabilidad para idempotencia e historial

## 5. Modelo de datos propuesto, basado en el esquema real

La propuesta se basa en la implementación actual y en `supabase/propuestas/20261107000100_evolucion_comercial.sql`:

- `empresas` y `sucursales`: aislamiento por empresa y sucursal
- `usuarios_sucursales` y `empresas_usuarios`: acceso y rol por sucursal
- `productos_catalogo` y `variantes_producto`: catálogo + SKU/variante
- `existencias`: cantidad real y costo promedio
- `movimientos_inventario`: ledger de entradas, ventas y ajustes
- `ventas_comerciales`: cabecera de ventas con líneas, pagos y idempotencia
- `clientes`: registros de clientes
- `cuentas_por_cobrar`: saldo y vencimientos
- `abonos`: pagos parciales sobre la cuenta por cobrar
- `caja_aperturas`, `caja_movimientos`, `caja_cierres`: ese módulo del día
- `proveedores`: registros de proveedores y relaciones con entradas de mercancía

### Reglas esenciales del modelo

- `codigo_barras` en el nivel variante/SKU
- unicidad global o por empresa según el ámbito que se acuerde
- costo promedio ponderado para inventario y trazabilidad
- ventas con idempotencia por huella y líneas por SKU
- abonos con validación transaccional de saldo
- cierre de caja con diferencia y responsable

## 6. Migraciones y seguridad

La ampliación no debe ejecutarse en producción sin respaldo y validación en entorno de desarrollo o staging.

Requisitos mínimos:

- migraciones bajo `supabase/migrations/`
- pruebas de integridad antes de aplicar
- bloqueo de doble apertura de caja
- validación de abonos concurrentes
- comprobación de idsempotencia para ventas y abonos
- RLS cuando corresponda
- intervención manual del responsable para aprobar la migración final

No se debe mezclar la base comercial con los datos del módulo legado sin un análisis de compatibilidad.

## 7. Rutas API y servicios propuestos

### Datos e inventario

- `GET /api/panel/inventario-comercial`
- `GET /api/panel/inventario-comercial/productos`
- `POST /api/panel/inventario-comercial/ajustes`
- `GET /api/panel/evolucion`

### Ventas y pagos

- `POST /api/panel/ventas/comerciales`
- `GET /api/panel/ventas/exportar`
- `GET /api/panel/inventario/exportar`

### Finanzas, clientes y proveedores

- `GET/POST/PATCH /api/panel/proveedores`
- `GET/POST/PATCH /api/panel/clientes`
- `GET/POST /api/panel/cuentas-por-cobrar`
- `GET/POST /api/panel/abonos`
- `GET /api/panel/caja`
- `POST /api/panel/caja/apertura`
- `POST /api/panel/caja/cierre`

Toda ruta debe exigir sesión y aplicar el rol correcto. Los handlers del dueño deben bloquear operaciones del trabajador, aunque la UI se oculte parcialmente.

## 8. Páginas y componentes sugeridos

- `/panel/etiquetas`: código de barras, impresión y búsqueda
- `/panel/inventario`: filtros, stock mínimo, estado bajo/agotado
- `/panel/evolucion`: métricas y tendencias
- `/panel/ventas/nueva`: venta con línea por producto, método de pago y crédito
- `/panel/proveedores`: listado/alta/edición/desactivación
- `/panel/clientes`: clientes, saldo y abonos
- `/panel/caja`: apertura, movimientos, cierre e historial
- `/panel/economia`: utilidad según costo confiable y limitaciones explícitas

## 9. Seguridad y permisos

- `exigirUsuario()` para funcionalidad general del panel.
- `exigirDueno()` para proveedores, clientes, crédito, abonos, caja y dashboard financiero.
- Las respuestas de trabajador deben excluir costos y datos financieros privados.
- Las rutas deben verificar sesión en servidor, no confiar en el cliente.
- La validación no debe usarse como único escudo; los servicios también deben comprobar acceso.

## 10. Validaciones y manejo de errores

- códigos de barra duplicados rechazados con error de negocio claro
- stock insuficiente con rollback transaccional
- abonos superiores al saldo rechazados con bloqueo de concurrencia
- cierre de caja duplicado y cajas abiertas múltiples prohibidas
- errores de negocio centralizados con `ErrorDeNegocio(codigo)`
- respuestas HTTP estandarizadas con `lib/http/respuestas.ts`

## 11. Estrategia de transacciones e idempotencia

- detectar huella de idempotencia en ventas, abonos y caja
- usar transacciones para reservas de inventario y recepción de efectivo
- mantener movimientos append-only, sin borrar ventas o abonos históricos
- usar bloqueo de fila o aislamiento apropiado para operaciones concurrentes
- si la operación se reintenta, no debe duplicar movimientos ni descontar inventario dos veces

## 12. Estrategia de pruebas

Se deben cubrir estas comprobaciones:

- códigos duplicados y desconocidos
- stock bajo y agotado
- apertura y cierre de caja
- separación de efectivo vs transferencia/tarjeta
- venta a crédito sin considerar saldo pendiente como efectivo
- abono parcial y saldo final
- abono superior al saldo
- doble abono simultáneo
- flujo de trabajador vs dueño
- dashboard con datos manuales verificados
- validación de fechas en zona Bogotá

## 13. Riesgos, dependencias y preguntas pendientes

### Riesgos

- cambios estructurales sobre la base actual sin respaldo
- mezclas entre inventario legacy y comercio multiempresa
- costeo histórico incompleto para ventas legadas
- doble contabilización de movimientos financieros
- acceso por trabajador a información privilegiada si el filtrado solo es visual

### Dependencias

- aprobación del responsable de la migración de esquema comercial
- respaldo/restauración de la base de pruebas
- entorno de staging o desarrollo
- definición explícita del alcance de caja por tienda/sucursal/usuario
- confirmación de la regla de negocio para el estado `activo` de proveedores y clientes

### Preguntas pendientes antes de P13

1. ¿La caja se aplica por tienda, sucursal, terminal o usuario?
2. ¿El código de barras será global por empresa o único para toda la operación?
3. ¿Se habilita un dashboard financiero completo con utilidades históricas o solo ventas y saldos pendientes?
4. ¿Se incorporan proveedores y compras como pieza activa o solo se expone el catálogo de proveedores?
5. ¿Se requiere soporte de cámara/física en móviles reales o basta con la comprobación del navegador y la búsqueda manual?

## 14. Conclusión del plan

La auditoría confirma que el repositorio ya está funcional y que la expansión comercial de la mejora está parcialmente modelada en archivos de diagnóstico y propuesta, pero todavía requiere aprobación explícita y validación de entorno antes de aplicar migraciones estructurales.

La próxima etapa segura es P13, siempre que el responsable confirme:

- alcance del modelo multiempresa/variantes
- ámbito de la caja abierta
- reglas exactas de proveedores, clientes, crédito y abonos
- ambiente de pruebas y respaldo antes de cambiar PostgreSQL

## 15. Evidencia ejecutada

- Revisión del repositorio real.
- Verificación de `npm test` con 158 pruebas pasadas.
- Verificación de `npm run build` con compilación exitosa.
- Se evita la manipulación de `.env.local` y no se exponen secretos o credenciales reales.

## 16. Decisiones aprobadas y estado de implementación · 2026-11-14

La persona responsable confirmó el uso de una base de desarrollo/pruebas con respaldo reciente, que el negocio opera sin empresas ni sucursales y que el código de barras es único por producto registrado. Se implementó sobre las tablas legadas de Stockly; no se activó la propuesta multiempresa de `supabase/propuestas/`.

- Caja: una sola caja global abierta, serializada por transacción e índice único parcial.
- Códigos: se asocian a producto legado, globalmente únicos; productos anteriores pueden seguir sin código.
- Accesos: trabajadores conservan las funciones compartidas existentes; caja, clientes, proveedores, créditos, abonos y dashboard comercial se restringen al dueño, como exige la política de privacidad económica del proyecto.
- Historial contable: no se clasifican retroactivamente ventas previas; el directorio de proveedores no inventa compras o cuentas por pagar; no se calcula utilidad histórica con costos no verificables.
- Migraciones activas `20261114000100` a `20261114000400` aplicadas en la base de desarrollo/pruebas. La verificación del esquema y las pruebas transaccionales/concurrentes de `npm run probar:comercial` terminaron sin fallas.
- Implementación P13–P17 disponible en el código. Aceptación manual A-24–A-44, incluyendo lector/cámara y navegación autenticada por ambos roles, permanece sin diligenciar y no se considera aprobada.
