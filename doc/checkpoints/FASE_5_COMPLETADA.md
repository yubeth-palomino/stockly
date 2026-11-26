# Fase 5 completada · Interfaz

- Inventario: filtros en URL, tabla adaptable, detalle, eventos, ventas y acciones protegidas por rol.
- Entrada de mercancía: validación cliente/servidor, detección de re-stock, suma de unidades y enlace al producto.
- Ventas: búsqueda por referencia y talla, validación de stock, confirmación y tratamiento de conflictos por concurrencia; historial filtrable.
- Verificación automatizada: registrada en `doc/ESTADO_EJECUCION.md`.
- La aceptación visual final debe ejecutarse en Vercel con cuentas de trabajador y dueño; ver `doc/ACEPTACION.md`.
- Revalidación P10 2026-11-25: `npm run build` y `npm run lint` finalizaron correctamente; Vitest pasó 62 archivos y 212 pruebas.
