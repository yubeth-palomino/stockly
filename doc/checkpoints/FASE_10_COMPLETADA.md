# Fase 10 · Reglas, servicios y API

- Ventas pagadas y a crédito usan una transacción con inventario, pagos efectivos y movimiento de caja; los saldos pendientes no se contabilizan como cobro.
- Idempotencia por huella y clave para ventas, caja, abonos y cierres; abonos bloquean cuenta/venta para evitar sobrepago simultáneo.
- Caja separa efectivo y otros medios, evita egresos de efectivo superiores al saldo y mantiene trazabilidad de origen.
- Rutas financieras y métodos de servicio comprueban rol de dueño; pruebas de ruta verifican el rechazo del trabajador.
- `npm run probar:comercial` completó las 14 verificaciones transaccionales/concurrentes contra la base de pruebas y limpió los registros temporales.
