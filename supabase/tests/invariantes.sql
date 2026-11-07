-- Ejecutar solo en Supabase local o en un proyecto aislado de pruebas.
SELECT id FROM public.productos WHERE cantidad < 0;

SELECT id
FROM public.ventas
WHERE cantidad_devuelta > cantidad;

SELECT v.id
FROM public.ventas AS v
LEFT JOIN public.productos AS p ON p.id = v.producto_id
WHERE p.id IS NULL;

SELECT v.id
FROM public.ventas AS v
WHERE v.estado = 'completada'
  AND v.idempotency_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.eventos_inventario AS e
    WHERE e.tipo = 'venta'
      AND CASE
        WHEN e.detalle->>'venta_id' ~ '^[0-9]+$'
          THEN (e.detalle->>'venta_id')::bigint = v.id
        ELSE false
      END
  );

SELECT idempotency_key
FROM public.ventas
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING count(*) > 1;
