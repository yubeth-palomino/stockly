ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS costo_unitario integer
    CHECK (costo_unitario IS NULL OR costo_unitario > 0),
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS cantidad_devuelta integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'completada'
    CHECK (estado IN ('completada', 'devuelta_parcial', 'devuelta_total'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.ventas'::regclass
      AND conname = 'chk_ventas_cantidad_devuelta'
  ) THEN
    ALTER TABLE public.ventas
      ADD CONSTRAINT chk_ventas_cantidad_devuelta
      CHECK (cantidad_devuelta BETWEEN 0 AND cantidad);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_idem
  ON public.ventas (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_producto_id uuid,
  p_cantidad integer,
  p_precio integer,
  p_idem text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := public.usuario_actual();
  v_producto public.productos%ROWTYPE;
  v_id bigint;
  v_venta public.ventas%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0
    OR p_precio IS NULL OR p_precio <= 0 THEN
    RAISE EXCEPTION 'Cantidad y precio deben ser mayores a 0';
  END IF;
  IF p_idem IS NULL OR pg_catalog.btrim(p_idem) = '' THEN
    RAISE EXCEPTION 'La clave de idempotencia es obligatoria';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idem, 0)
  );
  SELECT v.* INTO v_venta
  FROM public.ventas AS v
  WHERE v.idempotency_key = p_idem;
  IF FOUND THEN
    IF v_venta.usuario_id IS DISTINCT FROM v_user
      OR v_venta.producto_id IS DISTINCT FROM p_producto_id
      OR v_venta.cantidad IS DISTINCT FROM p_cantidad
      OR v_venta.precio_venta IS DISTINCT FROM p_precio THEN
      RAISE EXCEPTION 'La clave de idempotencia ya se usó con otros datos';
    END IF;
    RETURN v_venta.id;
  END IF;

  SELECT p.* INTO v_producto
  FROM public.productos AS p
  WHERE p.id = p_producto_id
    AND p.activo
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no existe o está inactivo';
  END IF;
  IF v_producto.cantidad < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente (hay %)', v_producto.cantidad;
  END IF;

  UPDATE public.productos
  SET cantidad = cantidad - p_cantidad,
      updated_at = pg_catalog.now()
  WHERE id = v_producto.id;

  INSERT INTO public.ventas (
    producto_id, usuario_id, referencia, talla, cantidad,
    precio_venta, costo_unitario, fecha_venta, idempotency_key
  )
  VALUES (
    v_producto.id, v_user, v_producto.referencia, v_producto.talla,
    p_cantidad, p_precio, v_producto.precio_compra,
    (pg_catalog.now() AT TIME ZONE 'America/Bogota')::date, p_idem
  )
  RETURNING id INTO v_id;

  INSERT INTO public.eventos_inventario (producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_producto.id, v_user, 'venta',
    pg_catalog.jsonb_build_object(
      'venta_id', v_id,
      'delta', -p_cantidad,
      'stock_resultante', v_producto.cantidad - p_cantidad
    )
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.devolver_venta(
  p_venta_id bigint,
  p_cantidad integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := public.usuario_actual();
  v_venta public.ventas%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad a devolver debe ser mayor a 0';
  END IF;

  SELECT v.* INTO v_venta
  FROM public.ventas AS v
  WHERE v.id = p_venta_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no existe';
  END IF;
  IF p_cantidad > v_venta.cantidad - v_venta.cantidad_devuelta THEN
    RAISE EXCEPTION 'Cantidad a devolver inválida (máximo %)',
      v_venta.cantidad - v_venta.cantidad_devuelta;
  END IF;

  UPDATE public.ventas
  SET cantidad_devuelta = cantidad_devuelta + p_cantidad,
      estado = CASE
        WHEN cantidad_devuelta + p_cantidad = cantidad THEN 'devuelta_total'
        ELSE 'devuelta_parcial'
      END
  WHERE id = p_venta_id;

  UPDATE public.productos
  SET cantidad = cantidad + p_cantidad,
      updated_at = pg_catalog.now()
  WHERE id = v_venta.producto_id;

  INSERT INTO public.eventos_inventario (producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_venta.producto_id, v_user, 'devolucion_venta',
    pg_catalog.jsonb_build_object(
      'venta_id', p_venta_id,
      'delta', p_cantidad
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_entrada(
  p_producto_id uuid,
  p_cantidad integer,
  p_costo integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := public.usuario_actual();
  v_producto public.productos%ROWTYPE;
  v_nuevo integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0
    OR (p_costo IS NOT NULL AND p_costo <= 0) THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a 0 y el costo, si se informa, debe ser positivo';
  END IF;
  IF p_costo IS NOT NULL AND NOT public.es_dueno() THEN
    RAISE EXCEPTION 'Solo el dueño puede registrar el costo de compra';
  END IF;

  SELECT p.* INTO v_producto
  FROM public.productos AS p
  WHERE p.id = p_producto_id
    AND p.activo
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no existe o está inactivo';
  END IF;

  IF p_costo IS NOT NULL THEN
    v_nuevo := pg_catalog.round(
      (
        v_producto.cantidad * COALESCE(v_producto.precio_compra, p_costo)
        + p_cantidad * p_costo
      )::numeric / (v_producto.cantidad + p_cantidad)
    );
  END IF;

  UPDATE public.productos
  SET cantidad = cantidad + p_cantidad,
      precio_compra = COALESCE(v_nuevo, precio_compra),
      updated_at = pg_catalog.now()
  WHERE id = v_producto.id;

  INSERT INTO public.eventos_inventario (producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_producto.id, v_user, 'entrada',
    pg_catalog.jsonb_build_object(
      'delta', p_cantidad,
      'costo', p_costo,
      'costo_promedio', v_nuevo
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ajustar_stock(
  p_producto_id uuid,
  p_nueva_cantidad integer,
  p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := public.usuario_actual();
  v_producto public.productos%ROWTYPE;
BEGIN
  IF v_user IS NULL OR NOT public.es_dueno() THEN
    RAISE EXCEPTION 'Solo el dueño puede ajustar stock';
  END IF;
  IF p_nueva_cantidad IS NULL OR p_nueva_cantidad < 0
    OR COALESCE(pg_catalog.btrim(p_motivo), '') = '' THEN
    RAISE EXCEPTION 'Cantidad >= 0 y motivo obligatorio';
  END IF;

  SELECT p.* INTO v_producto
  FROM public.productos AS p
  WHERE p.id = p_producto_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no existe';
  END IF;

  UPDATE public.productos
  SET cantidad = p_nueva_cantidad,
      updated_at = pg_catalog.now()
  WHERE id = v_producto.id;

  INSERT INTO public.eventos_inventario (producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_producto.id, v_user, 'ajuste',
    pg_catalog.jsonb_build_object(
      'delta', p_nueva_cantidad - v_producto.cantidad,
      'motivo', pg_catalog.btrim(p_motivo)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_venta(uuid, integer, integer, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.devolver_venta(bigint, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_entrada(uuid, integer, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ajustar_stock(uuid, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(uuid, integer, integer, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.devolver_venta(bigint, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrada(uuid, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_stock(uuid, integer, text)
  TO authenticated;
