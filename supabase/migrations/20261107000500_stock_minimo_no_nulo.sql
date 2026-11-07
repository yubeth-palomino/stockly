ALTER TABLE public.productos
  ALTER COLUMN stock_minimo SET NOT NULL;

ALTER TABLE public.productos
  VALIDATE CONSTRAINT chk_productos_stock_minimo_no_negativo;
