BEGIN;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS pago_registrado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cajas
  ADD COLUMN IF NOT EXISTS clave_apertura UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS clave_cierre UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS huella_cierre VARCHAR(64);

ALTER TABLE public.caja_movimientos
  ADD COLUMN IF NOT EXISTS huella_idempotencia VARCHAR(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cajas'::regclass
      AND conname = 'cajas_huella_cierre_valida'
  ) THEN
    ALTER TABLE public.cajas
      ADD CONSTRAINT cajas_huella_cierre_valida
      CHECK (huella_cierre IS NULL OR huella_cierre ~ '^[a-f0-9]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.caja_movimientos'::regclass
      AND conname = 'caja_movimientos_huella_valida'
  ) THEN
    ALTER TABLE public.caja_movimientos
      ADD CONSTRAINT caja_movimientos_huella_valida
      CHECK (huella_idempotencia IS NULL OR huella_idempotencia ~ '^[a-f0-9]{64}$');
  END IF;
END;
$$;

COMMIT;
