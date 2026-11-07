# Fase 7 completada · Módulo económico

- Precio de compra y campos económicos disponibles solo para el dueño.
- La validación rechaza precios de venta inferiores o iguales al costo; el re-stock permite actualizar el costo y conserva el anterior si no se envía uno nuevo.
- Economía calcula inversión, ganancia potencial de productos activos y ganancia realizada a partir de ventas históricas; los productos sin costo se identifican y aportan cero.
- Las rutas de productos ignoran `precioCompra` enviado por trabajadores, incluso cuando el valor es inválido.
- Verificación local: `npm run build`, `npm run lint`, `npm run type-check`, `npm test` (95/95), `npm run db:verificar` (0 fallas) y `npm run probar:flujo` (17/17, 0 fallas).
- A-01 a A-23 están definidos en `doc/ACEPTACION.md`, pero siguen sin diligenciar. La aceptación autenticada con cuentas de dueño y trabajador en Vercel queda pendiente.
