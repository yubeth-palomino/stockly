BEGIN;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS foto_path TEXT;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'stockly-productos',
  'stockly-productos',
  false,
  3145728,
  ARRAY['image/jpeg']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/jpeg'];

COMMIT;
