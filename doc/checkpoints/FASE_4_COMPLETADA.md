# Fase 4 completada · Datos y API

## P04 · Capa de datos

- `npm run probar:flujo`: 13/13 pasos OK, 0 fallas.
- Limpieza final de pruebas: 2 ventas, 6 eventos, 1 producto y 1 usuario eliminados.
- `npm run db:demo`: 8 productos DEMO y 2 ventas cargadas; 2 productos quedaron agotados.
- `npm run db:verificar`: restricciones, índices únicos y RLS comprobados; total de fallas 0.

## P05 · API

- Las rutas protegidas responden 401 sin sesión en GET `/api/panel/resumen`, GET `/api/panel/productos` y POST `/api/panel/ventas`.
- Con sesión real de dueño, GET `/api/panel/productos` respondió 200 con 8 filas e incluyó `precioCompra`; GET `/api/panel/usuarios` respondió 200.
- Las pruebas de ruta simulan el rol trabajador: consultar usuarios devuelve 403 y la lista de productos se solicita con rol `trabajador`. El servicio de datos omite `precioCompra` para ese rol.
- No se verificó con una sesión real de trabajador; no se creó cuenta Auth nueva.

## Validación

- `npm test`: 22 archivos, 84 pruebas aprobadas.
- `npm run type-check`: correcto.
- ESLint focalizado y Prettier: correctos.
- `npm run build`: correcto.
