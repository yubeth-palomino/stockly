-- SCRIPT DE RELLENO MANUAL. No ejecutar sin revisar y aprobar los productos afectados.
-- Requiere aplicar primero 20261107000400_stock_minimo.sql.
-- Asigna el umbral inicial 0 únicamente a filas todavía sin configurar.
UPDATE public.productos
SET stock_minimo = 0
WHERE stock_minimo IS NULL;
