# Fase 9 · Base de datos comercial

- Se adaptó el esquema legado (sin empresas ni sucursales) y se mantuvieron las ventas históricas sin imputación de pagos.
- Se añadieron tablas/columnas para clientes, proveedores, pagos, cuentas por cobrar, abonos y caja; claves de idempotencia, relación de cliente a venta e índices de consultas financieras.
- Una caja abierta global y el código de barras único por producto siguen los acuerdos confirmados para la base de pruebas.
- Migraciones `20261114000100`–`20261114000400` aplicadas; `npm run db:verificar` aprobó tablas, RLS, índices, columnas y restricciones con 0 fallas.
- La migración no se ejecutó en producción. La prueba concurrente de caja se documenta en `FASE_10_COMPLETADA.md`.
