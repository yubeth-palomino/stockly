# Aceptación manual · mejoras comerciales

Los casos se mantienen pendientes hasta ejecutarlos con el perfil y entorno indicados. En el cierre del 2026-11-26 no se ejecutaron contra staging: faltan las variables Preview y la base aislada no tiene migraciones aplicadas.

Nota de cierre 2026-11-26: el resultado histórico de 14/14 comprobaciones comerciales corresponde a una ejecución anterior en base aislada y no se repitió en este cierre. Las pruebas automatizadas no sustituyen la aceptación manual; cámara/lector requiere además hardware físico.

| ID   | Acción                      | Resultado esperado                               | Resultado obtenido | Evidencia | Observaciones |
| ---- | --------------------------- | ------------------------------------------------ | ------------------ | --------- | ------------- |
| A-24 | Generar código de barras    | Código único para SKU/variante                   | Pendiente: no verificado contra staging. |           |               |
| A-25 | Leer código de barras       | Se identifica el artículo correcto               | Pendiente: hardware y staging. |           | Cámara/lector físico. |
| A-26 | Buscar manualmente          | Se encuentra el artículo sin cámara              | Pendiente: no verificado contra staging. |           |               |
| A-27 | Configurar mínimo           | Se guarda el umbral                              | Pendiente: no verificado contra staging. |           |               |
| A-28 | Llegar a stock bajo         | Aparece alerta correcta                          | Pendiente: no verificado contra staging. |           |               |
| A-29 | Agotar existencias          | Se identifica como agotado                       | Pendiente: no verificado contra staging. |           |               |
| A-30 | Abrir caja                  | Se crea sesión con responsable                   | Pendiente: no verificado contra staging. |           |               |
| A-31 | Registrar movimientos       | Ingresos/egresos quedan trazables                | Pendiente: no verificado contra staging. |           |               |
| A-32 | Cerrar caja                 | Diferencia calculada correctamente               | Pendiente: no verificado contra staging. |           |               |
| A-33 | Consultar historial de caja | Se muestran cierres anteriores y sus movimientos | Pendiente: no verificado contra staging. |           |               |
| A-34 | Crear proveedor             | Proveedor guardado                               | Pendiente: no verificado contra staging. |           |               |
| A-35 | Editar proveedor            | Datos actualizados                               | Pendiente: no verificado contra staging. |           |               |
| A-36 | Crear cliente               | Cliente guardado                                 | Pendiente: no verificado contra staging. |           |               |
| A-37 | Registrar venta a crédito   | Se crea saldo por cobrar                         | Pendiente: no verificado contra staging. |           |               |
| A-38 | Registrar abono             | Saldo disminuye correctamente                    | Pendiente: no verificado contra staging. |           |               |
| A-39 | Consultar historial         | Se ven todos los abonos                          | Pendiente: no verificado contra staging. |           |               |
| A-40 | Probar acceso de trabajador | Acceso financiero denegado                       | Pendiente: no verificado contra staging. |           |               |
| A-41 | Consultar dashboard         | Indicadores coinciden con datos                  | Pendiente: no verificado contra staging. |           |               |
| A-42 | Filtrar gráficos            | Se actualizan por período                        | Pendiente: no verificado contra staging. |           |               |
| A-43 | Ver productos más vendidos  | Ranking correcto                                 | Pendiente: no verificado contra staging. |           |               |
| A-44 | Comparar ventas y cobros    | No existe doble contabilización                  | Pendiente: no verificado contra staging. |           |               |

## Evidencia automatizada disponible

- `npm test`: suites unitarias y de rutas; cubren validación de rango, bloqueo de caja/dashboard para trabajador y reglas financieras.
- `npm run probar:comercial` (requiere `STOCKLY_PRUEBA_COMERCIAL=SI`): en una base de pruebas ejecuta apertura concurrente, reintentos de venta/abono/cierre, crédito, abonos concurrentes, separación de caja y conciliación básica del dashboard. La ejecución histórica 14/14 no se repitió en este cierre; limpia registros creados con prefijo `PRUEBA-COM-`.
- `npm run db:verificar`: comprueba tablas, RLS, índices, columnas y restricciones; las mutaciones de integridad terminan en `ROLLBACK`.

La lectura por cámara/lector físico, la navegación real con dueño y trabajador y la aceptación visual en navegador siguen pendientes de diligenciamiento. Los casos sin hardware también requieren primero un staging migrado con datos de prueba.
