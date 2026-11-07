-- SCRIPT DE RELLENO MANUAL. No ejecutar sin revisar y aprobar los productos afectados.
-- Requiere aplicar primero 20261107000300_codigos_barras.sql.
-- Solo asigna códigos a filas que aún tienen codigo_barras NULL.
WITH filas_pendientes AS MATERIALIZED (
  SELECT id,
         '20' || lpad(nextval('public.codigo_barras_producto_seq')::text, 10, '0') AS cuerpo
  FROM public.productos
  WHERE codigo_barras IS NULL
  ORDER BY id
),
digitos_verificadores AS (
  SELECT filas.id,
         filas.cuerpo,
         sum(
           substring(filas.cuerpo FROM posicion FOR 1)::integer
           * CASE WHEN posicion % 2 = 1 THEN 1 ELSE 3 END
         ) AS suma
  FROM filas_pendientes AS filas
  CROSS JOIN LATERAL generate_series(1, 12) AS posicion
  GROUP BY filas.id, filas.cuerpo
)
UPDATE public.productos AS producto
SET codigo_barras = digitos.cuerpo || ((10 - digitos.suma % 10) % 10)::text
FROM digitos_verificadores AS digitos
WHERE producto.id = digitos.id
  AND producto.codigo_barras IS NULL;
