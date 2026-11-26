# Fase 7 · Implementación técnica; prompt P11 no cerrado

P11 requiere como precondición que `doc/ACEPTACION.md` esté diligenciado. Como A-01–A-19 siguen pendientes, este archivo registra el trabajo técnico, pero no acredita que el prompt ni la fase estén formalmente completados. También falta A-21 y la verificación de acceso con una sesión real de trabajador.

La discrepancia de fórmula se resolvió el 2026-11-26 con la decisión de usar el precio de compra actual del producto en P11, de acuerdo con `PLAN_STOCKLY.md` §9 y el prompt. `obtenerEconomia` ya aplica esa regla. El dashboard P13–P17 conserva por separado la métrica histórica basada en `ventas.costo_unitario`, ahora aclarada en `PLAN_MEJORAS.md` §4.4.

- Precio de compra y campos económicos disponibles solo para el dueño.
- La validación rechaza precios de venta inferiores o iguales al costo; el re-stock permite actualizar el costo y conserva el anterior si no se envía uno nuevo.
- Economía calcula inversión, ganancia potencial de productos activos y ganancia realizada a partir de ventas históricas; los productos sin costo se identifican y aportan cero.
- Las rutas de productos ignoran `precioCompra` enviado por trabajadores, incluso cuando el valor es inválido.
- Verificación local: `npm run build`, `npm run lint`, `npm run type-check`, `npm test` (95/95), `npm run db:verificar` (0 fallas) y `npm run probar:flujo` (17/17, 0 fallas).
- A-01 a A-23 están definidos en `doc/ACEPTACION.md`, pero siguen sin diligenciar. La aceptación autenticada con cuentas de dueño y trabajador en Vercel queda pendiente.
- Revalidación 2026-11-25: se añadió la ganancia realizada histórica desde `ventas.costo_unitario`; ventas nuevas conservan el costo vigente al momento de vender y el resumen excluye ventas sin costo verificable.
- Revalidación 2026-11-26: para P11, `obtenerEconomia` se alineó con el plan y usa el precio de compra actual del producto. Build, 212/212 pruebas, lint y type-check pasaron. La verificación manual y la precondición de aceptación continúan pendientes.
