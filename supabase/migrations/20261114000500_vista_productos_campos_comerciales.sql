BEGIN;

CREATE OR REPLACE VIEW public.v_productos
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.referencia,
  p.clave_referencia,
  p.marca,
  p.descripcion,
  p.talla,
  p.clave_talla,
  p.cantidad,
  p.precio_venta,
  p.precio_compra,
  p.fecha_entrada,
  p.activo,
  p.created_at,
  p.updated_at,
  (p.cantidad > 0) AS disponible,
  p.codigo_barras,
  p.stock_minimo
FROM public.productos p;

REVOKE ALL ON public.v_productos FROM anon, authenticated;

COMMIT;
