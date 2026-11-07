# Aceptación de Stockly

Ejecutar los casos en el despliegue de Vercel con una cuenta de trabajador y una de dueño. Registrar el resultado real y adjuntar evidencia; no marcar como aprobados casos que no se hayan ejecutado.

| ID | Acción | Resultado esperado | Resultado obtenido | Evidencia | Observación |
|---|---|---|---|---|---|
| A-01 | Entrar como trabajador | Llega a `/panel`; no ve Usuarios ni Economía | | | |
| A-02 | Registrar `CAM001` marca Nike, talla M, 10 unidades, precio 60.000 | Producto creado, disponible | | | |
| A-03 | Registrar `cam001` talla m, 5 unidades | Suma: 15 unidades, un solo registro | | | |
| A-04 | Registrar con cantidad 0 | Rechazo con mensaje | Aprobado: se rechaza y muestra “La cantidad debe ser mayor que cero.” | Vercel, `/panel/inventario/nuevo`, 2026-11-07 | Repetido tras desplegar la corrección; no se envió el formulario. |
| A-05 | Registrar con fecha de mañana | Rechazo con mensaje | Aprobado: muestra “La fecha de entrada no puede ser posterior a hoy.” | Vercel, `/panel/inventario/nuevo`, 2026-11-07 | Se rechazó antes de enviar el formulario. |
| A-06 | Buscar inventario por marca "Nike" | Muestra `CAM001` | | | |
| A-07 | Como trabajador, revisar que no aparece el precio de compra en ninguna pantalla | No aparece | | | |
| A-08 | Vender `CAM001` talla M, 20 unidades | Rechazo por stock insuficiente; sigue en 15 | | | |
| A-09 | Vender `CAM001` talla M, 15 unidades | Venta registrada; queda en 0 y agotado | | | |
| A-10 | Vender `CAM001` talla M, 1 unidad | Rechazo por stock | | | |
| A-11 | Filtrar inventario por "Solo disponibles" | `CAM001` no aparece | | | |
| A-12 | Cerrar sesión y entrar como dueño | Ve Usuarios y Economía | Aprobado: sesión de dueño; navegación muestra Usuarios y Economía | Vercel, `/panel`, 2026-11-07 | Resumen mostró 8 productos activos, 45 unidades y 2 agotados. |
| A-13 | Como dueño, crear un usuario trabajador | Aparece en Usuarios | | | |
| A-14 | Intentar quitarse el rol de dueño siendo el único dueño | Rechazo `ULTIMO_DUENO` | | | |
| A-15 | Desactivar `CAM001` (cantidad 0) | Queda inactivo | | | |
| A-16 | Consultar ventas y ver la fecha y el precio guardado | Las dos ventas con su precio | | | |
| A-17 | Cerrar el navegador, volver a entrar | Los datos persisten | | | |
| A-18 | Abrir `/panel` en ventana privada | Redirección al login | Aprobado: sin cookies, `/panel` responde 307 hacia `/login` | Vercel, comprobación HTTP sin sesión, 2026-11-07 | No se siguieron redirecciones. |
| A-19 | Como trabajador, abrir directamente `/api/panel/economia` | 403 `SIN_PERMISO` | | | |
| A-20 | Como dueño, registrar o actualizar el precio de compra de un producto | Se guarda el costo y solo el dueño puede verlo | | | |
| A-21 | Como dueño, intentar un precio de venta menor o igual al precio de compra | Rechazo `PRECIO_VENTA_NO_SUPERA_COMPRA` | | | |
| A-22 | Abrir `/panel/economia` como dueño y contrastar un caso con cálculo manual | Inversión y ganancias coinciden con las cantidades, costos y ventas | | | |
| A-23 | Revisar un producto agotado que tenga ventas | Aporta 0 a ganancia potencial; sus ventas cuentan en la realizada | | | |
