CREATE TABLE IF NOT EXISTS public._migrations (
  id serial PRIMARY KEY,
  archivo text UNIQUE NOT NULL,
  aplicada_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restablecimientos_contrasena (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expira_en timestamptz NOT NULL,
  usado_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restablecimientos_contrasena_usuario_idx
  ON public.restablecimientos_contrasena (usuario_id);

ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restablecimientos_contrasena ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.usuario_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id
  FROM public.usuarios AS u
  WHERE u.auth_ref = auth.uid()::text
    AND u.activo
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.es_dueno()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios AS u
    WHERE u.auth_ref = auth.uid()::text
      AND u.activo
      AND u.rol = 'dueno'
  )
$$;

REVOKE ALL ON FUNCTION public.usuario_actual() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_dueno() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_dueno() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'productos' AND policyname = 'productos_leer'
  ) THEN
    CREATE POLICY productos_leer ON public.productos
      FOR SELECT TO authenticated
      USING ((SELECT public.usuario_actual()) IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'ventas' AND policyname = 'ventas_leer'
  ) THEN
    CREATE POLICY ventas_leer ON public.ventas
      FOR SELECT TO authenticated
      USING ((SELECT public.usuario_actual()) IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'eventos_inventario' AND policyname = 'eventos_leer'
  ) THEN
    CREATE POLICY eventos_leer ON public.eventos_inventario
      FOR SELECT TO authenticated
      USING ((SELECT public.es_dueno()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'usuarios' AND policyname = 'usuarios_leer'
  ) THEN
    CREATE POLICY usuarios_leer ON public.usuarios
      FOR SELECT TO authenticated
      USING (
        auth_ref = (SELECT auth.uid())::text
        OR (SELECT public.es_dueno())
      );
  END IF;
END;
$$;

REVOKE ALL ON TABLE public._migrations, public.restablecimientos_contrasena
  FROM anon, authenticated;
REVOKE ALL ON TABLE public.productos, public.ventas, public.eventos_inventario, public.usuarios
  FROM anon, authenticated;

GRANT SELECT (
  id, referencia, clave_referencia, marca, descripcion, talla, clave_talla,
  cantidad, precio_venta, fecha_entrada, activo, created_at, updated_at
) ON TABLE public.productos TO authenticated;
GRANT SELECT (
  id, producto_id, usuario_id, referencia, talla, cantidad, precio_venta,
  fecha_venta, created_at
) ON TABLE public.ventas TO authenticated;
GRANT SELECT ON TABLE public.eventos_inventario, public.usuarios TO authenticated;

CREATE INDEX IF NOT EXISTS idx_ventas_usuario ON public.ventas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON public.eventos_inventario (usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON public.ventas (producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas (fecha_venta);
