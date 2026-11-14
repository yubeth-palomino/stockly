BEGIN;

CREATE INDEX IF NOT EXISTS idx_pagos_venta_created_at
  ON public.pagos_venta (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_abonos_created_at
  ON public.abonos (created_at DESC, id DESC);

COMMIT;
