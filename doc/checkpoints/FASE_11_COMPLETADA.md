# Fase 11 · Caja y funciones compartidas

- Se integró la búsqueda por código de barras con la selección del producto encontrado; se conservan el EAN/etiquetas y alertas de stock preexistentes.
- Caja exclusiva del dueño según la regla de confidencialidad de Stockly: apertura, ingresos/egresos, cierre confirmado, métodos por separado, ventas/abonos, responsable, historial y detalle de movimientos.
- El saldo en efectivo y los ingresos agregados se calculan sobre todos los movimientos, no solo el bloque visible de movimientos recientes.
- Pruebas automatizadas, compilación y verificación de esquema quedan registradas en `doc/ESTADO_EJECUCION.md`; A-24–A-33 siguen pendientes de aceptación manual.
