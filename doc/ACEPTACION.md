# Aceptación de Stockly

Ejecutar los casos en el despliegue de Vercel con una cuenta de trabajador y una de dueño. Registrar el resultado real y adjuntar evidencia; no marcar como aprobados casos que no se hayan ejecutado.

| ID | Acción | Resultado esperado | Resultado obtenido | Evidencia | Observación |
|---|---|---|---|---|---|
| A-01 | Entrar como trabajador | Llega a `/panel`; no ve Usuarios ni Economía | Pendiente: no se pudo acceder a la cuenta de trabajador. | | Recuperar o invitar la cuenta; no compartir credenciales. |
| A-02 | Registrar `CAM001` marca Nike, talla M, 10 unidades, precio 60.000 | Producto creado, disponible | Aprobado: producto creado con 10 unidades y disponible. | Vercel, detalle de `CAM001`, 2026-11-07 | Se registró costo de compra de 30.000 como dueño. |
| A-03 | Registrar `cam001` talla m, 5 unidades | Suma: 15 unidades, un solo registro | Aprobado: la entrada normalizada sumó 5 a las 10 existentes; quedó un registro con 15. | Vercel, `/panel/inventario/nuevo`, 2026-11-07 | |
| A-04 | Registrar con cantidad 0 | Rechazo con mensaje | Aprobado: se rechaza y muestra “La cantidad debe ser mayor que cero.” | Vercel, `/panel/inventario/nuevo`, 2026-11-07 | Repetido tras desplegar la corrección; no se envió el formulario. |
| A-05 | Registrar con fecha de mañana | Rechazo con mensaje | Aprobado: muestra “La fecha de entrada no puede ser posterior a hoy.” | Vercel, `/panel/inventario/nuevo`, 2026-11-07 | Se rechazó antes de enviar el formulario. |
| A-06 | Buscar inventario por marca "Nike" | Muestra `CAM001` | Aprobado: el filtro por marca devuelve `CAM001`. | Vercel, `/panel/inventario?marca=Nike`, 2026-11-07 | |
| A-07 | Como trabajador, revisar que no aparece el precio de compra en ninguna pantalla | No aparece | Pendiente: requiere una sesión de trabajador. | | |
| A-08 | Vender `CAM001` talla M, 20 unidades | Rechazo por stock insuficiente; sigue en 15 | Aprobado: mostró “Solo hay 15 unidades disponibles.” y bloqueó el envío. | Vercel, `/panel/ventas/nueva`, 2026-11-07 | La venta posterior de 15 confirmó que el stock no cambió. |
| A-09 | Vender `CAM001` talla M, 15 unidades | Venta registrada; queda en 0 y agotado | Aprobado: venta registrada por 900.000; producto agotado con 0 unidades. | Vercel, detalle de `CAM001`, 2026-11-07 | Venta inmutable, según autorización previa. |
| A-10 | Vender `CAM001` talla M, 1 unidad | Rechazo por stock | Aprobado: mostró “Solo hay 0 unidades disponibles.” y deshabilitó el envío. | Vercel, `/panel/ventas/nueva`, 2026-11-07 | |
| A-11 | Filtrar inventario por "Solo disponibles" | `CAM001` no aparece | Aprobado: con el filtro activo, `CAM001` no aparece. | Vercel, `/panel/inventario?soloDisponibles=true`, 2026-11-07 | Se esperó a que terminara la actualización de la lista. |
| A-12 | Cerrar sesión y entrar como dueño | Ve Usuarios y Economía | Aprobado: sesión de dueño; navegación muestra Usuarios y Economía | Vercel, `/panel`, 2026-11-07 | Resumen mostró 8 productos activos, 45 unidades y 2 agotados. |
| A-13 | Como dueño, crear un usuario trabajador | Aparece en Usuarios | Pendiente: no se tiene una identidad Auth/UUID de prueba ni acceso de trabajador. | | |
| A-14 | Intentar quitarse el rol de dueño siendo el único dueño | Rechazo `ULTIMO_DUENO` | Pendiente: no se arriesgó cambiar el único acceso de dueño disponible en producción. | | Probar con una cuenta/entorno aislado. |
| A-15 | Desactivar `CAM001` (cantidad 0) | Queda inactivo | Aprobado: el detalle muestra “Inactivo” y el movimiento “PRODUCTO DESACTIVADO”. | Vercel, detalle de `CAM001`, 2026-11-07 | |
| A-16 | Consultar ventas y ver la fecha y el precio guardado | Cada venta muestra su fecha, precio unitario y total | Aprobado: el historial muestra tres ventas; CAM001 conserva 60.000 por unidad y 900.000 total. | Vercel, `/panel/ventas`, 2026-11-07 | |
| A-17 | Cerrar el navegador, volver a entrar | Los datos persisten | Parcial: los datos persistieron tras navegar de nuevo al detalle; no se cerró el navegador ni se renovó la sesión. | Vercel, detalle de `CAM001`, 2026-11-07 | Falta repetir con cierre de sesión/navegador. |
| A-18 | Abrir `/panel` en ventana privada | Redirección al login | Aprobado: sin cookies, `/panel` responde 307 hacia `/login` | Vercel, comprobación HTTP sin sesión, 2026-11-07 | No se siguieron redirecciones. |
| A-19 | Como trabajador, abrir directamente `/api/panel/economia` | 403 `SIN_PERMISO` | Pendiente: requiere una sesión de trabajador; el 401 anónimo de A-18 no la sustituye. | | |
| A-20 | Como dueño, registrar o actualizar el precio de compra de un producto | Se guarda el costo y solo el dueño puede verlo | Aprobado para dueño: se guardó 30.000 y aparece en su detalle y en Economía. | Vercel, detalle de `CAM001`, 2026-11-07 | La visibilidad exclusiva del dueño sigue pendiente de A-07. |
| A-21 | Como dueño, intentar un precio de venta menor o igual al precio de compra | Rechazo `PRECIO_VENTA_NO_SUPERA_COMPRA` | Pendiente: no se cambió el precio de venta de un registro real de producción para provocar el rechazo. | | |
| A-22 | Abrir `/panel/economia` como dueño y contrastar un caso con cálculo manual | Inversión y ganancias coinciden con las cantidades, costos y ventas | Aprobado: CAM001: inversión disponible 0; ganancia potencial 0; realizada 450.000. Cálculo manual: (60.000 − 30.000) × 15 = 450.000. | Vercel, `/panel/economia`, 2026-11-07 | |
| A-23 | Revisar un producto agotado que tenga ventas | Aporta 0 a ganancia potencial; sus ventas cuentan en la realizada | Aprobado: CAM001 agotado mostró ganancia potencial 0; Economía reflejó 450.000 de ganancia realizada por su venta. | Vercel, detalle de `CAM001` y `/panel/economia`, 2026-11-07 | |
