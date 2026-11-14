# Fase 12 · Proveedores, clientes y crédito

- Directorio de proveedores y clientes con alta, edición, activación/desactivación, búsquedas y vistas de detalle protegidas.
- No se inventan compras ni cuentas por pagar; cliente muestra ventas, pagos y saldo acumulado.
- Venta a crédito crea cuenta por cobrar; pago inicial solo registra efectivo realmente recibido. Abonos parciales/finales quedan inmutables e idempotentes, actualizan el saldo y el movimiento de caja.
- Se ofrece selector de cliente y filtros de cuenta por cliente, estado y fecha; se muestra saldo antes/después del abono.
- La prueba de integración confirmó pagos iniciales, concurrencia de abonos, saldo final cero, reintentos y denegación de acceso al trabajador. A-34–A-40 siguen pendientes de aceptación manual.
