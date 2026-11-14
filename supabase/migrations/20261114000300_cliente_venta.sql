BEGIN;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS cliente_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ventas'::regclass
      AND conname = 'ventas_cliente_id_fkey'
  ) THEN
    ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_ventas_cliente_fecha
  ON public.ventas (cliente_id, fecha_venta DESC, id DESC)
  WHERE cliente_id IS NOT NULL;

COMMIT;
