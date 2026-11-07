CREATE SEQUENCE IF NOT EXISTS public.codigo_barras_producto_seq
  AS bigint
  MINVALUE 1
  MAXVALUE 9999999999
  START WITH 1
  NO CYCLE;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS codigo_barras text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_codigo_barras
  ON public.productos (codigo_barras)
  WHERE codigo_barras IS NOT NULL;
