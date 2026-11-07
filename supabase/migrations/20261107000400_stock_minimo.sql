ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS stock_minimo integer;

ALTER TABLE public.productos
  ALTER COLUMN stock_minimo SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.productos'::regclass
      AND conname = 'chk_productos_stock_minimo_no_negativo'
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT chk_productos_stock_minimo_no_negativo
      CHECK (stock_minimo IS NULL OR stock_minimo >= 0)
      NOT VALID;
  END IF;
END;
$$;
