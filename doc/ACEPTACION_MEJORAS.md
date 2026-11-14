# Aceptación manual · mejoras comerciales

Los casos se mantienen sin resultado hasta ejecutarlos manualmente con el perfil y el entorno indicados. Las pruebas automatizadas y de integración no sustituyen la aceptación visual con hardware ni la validación del usuario.

| ID   | Acción                      | Resultado esperado                               | Resultado obtenido | Evidencia | Observaciones |
| ---- | --------------------------- | ------------------------------------------------ | ------------------ | --------- | ------------- |
| A-24 | Generar código de barras    | Código único para SKU/variante                   |                    |           |               |
| A-25 | Leer código de barras       | Se identifica el artículo correcto               |                    |           |               |
| A-26 | Buscar manualmente          | Se encuentra el artículo sin cámara              |                    |           |               |
| A-27 | Configurar mínimo           | Se guarda el umbral                              |                    |           |               |
| A-28 | Llegar a stock bajo         | Aparece alerta correcta                          |                    |           |               |
| A-29 | Agotar existencias          | Se identifica como agotado                       |                    |           |               |
| A-30 | Abrir caja                  | Se crea sesión con responsable                   |                    |           |               |
| A-31 | Registrar movimientos       | Ingresos/egresos quedan trazables                |                    |           |               |
| A-32 | Cerrar caja                 | Diferencia calculada correctamente               |                    |           |               |
| A-33 | Consultar historial de caja | Se muestran cierres anteriores y sus movimientos |                    |           |               |
| A-34 | Crear proveedor             | Proveedor guardado                               |                    |           |               |
| A-35 | Editar proveedor            | Datos actualizados                               |                    |           |               |
| A-36 | Crear cliente               | Cliente guardado                                 |                    |           |               |
| A-37 | Registrar venta a crédito   | Se crea saldo por cobrar                         |                    |           |               |
| A-38 | Registrar abono             | Saldo disminuye correctamente                    |                    |           |               |
| A-39 | Consultar historial         | Se ven todos los abonos                          |                    |           |               |
| A-40 | Probar acceso de trabajador | Acceso financiero denegado                       |                    |           |               |
| A-41 | Consultar dashboard         | Indicadores coinciden con datos                  |                    |           |               |
| A-42 | Filtrar gráficos            | Se actualizan por período                        |                    |           |               |
| A-43 | Ver productos más vendidos  | Ranking correcto                                 |                    |           |               |
| A-44 | Comparar ventas y cobros    | No existe doble contabilización                  |                    |           |               |

## Evidencia automatizada disponible

- `npm test`: suites unitarias y de rutas; cubren validación de rango, bloqueo de caja/dashboard para trabajador y reglas financieras.
- `npm run probar:comercial` (requiere `STOCKLY_PRUEBA_COMERCIAL=SI`): en la base de pruebas ejecuta apertura concurrente, reintentos de venta/abono/cierre, crédito, abonos concurrentes, separación de caja y conciliación básica del dashboard. Limpia registros creados con prefijo `PRUEBA-COM-`.
- `npm run db:verificar`: comprueba tablas, RLS, índices, columnas y restricciones; las mutaciones de integridad terminan en `ROLLBACK`.

La lectura por cámara/lector físico, la navegación real con dueño y trabajador y la aceptación visual en navegador siguen pendientes de diligenciamiento.
