BEGIN;

CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(160) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT empresas_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);

CREATE TABLE IF NOT EXISTS public.sucursales (
  id UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre VARCHAR(120) NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sucursales_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT sucursales_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2),
  CONSTRAINT sucursales_nombre_unico UNIQUE (empresa_id, nombre)
);

CREATE TABLE IF NOT EXISTS public.empresas_usuarios (
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  rol VARCHAR(12) NOT NULL CHECK (rol IN ('dueno', 'trabajador')),
  alcance_sucursales VARCHAR(12) NOT NULL CHECK (alcance_sucursales IN ('todas', 'asignadas')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, usuario_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_empresas_usuarios_usuario
  ON public.empresas_usuarios (usuario_id);

CREATE TABLE IF NOT EXISTS public.usuarios_sucursales (
  empresa_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  sucursal_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, usuario_id, sucursal_id),
  FOREIGN KEY (empresa_id, usuario_id)
    REFERENCES public.empresas_usuarios(empresa_id, usuario_id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT
);

INSERT INTO public.empresas (id, nombre)
VALUES ('00000000-0000-4000-8000-000000000001', 'Negocio inicial')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sucursales (id, empresa_id, nombre)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Sucursal principal'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.usuarios
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.usuarios
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT usuarios_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_empresa_id
  ON public.usuarios (empresa_id, id);
DROP INDEX IF EXISTS public.ux_usuarios_usuario;
CREATE UNIQUE INDEX ux_usuarios_usuario
  ON public.usuarios (empresa_id, lower(btrim(usuario)));

INSERT INTO public.empresas_usuarios (empresa_id, usuario_id, rol, alcance_sucursales, activo)
SELECT u.empresa_id, u.id, u.rol,
       CASE WHEN u.rol = 'dueno' THEN 'todas' ELSE 'asignadas' END,
       u.activo
FROM public.usuarios AS u
ON CONFLICT (empresa_id, usuario_id) DO NOTHING;

INSERT INTO public.usuarios_sucursales (empresa_id, usuario_id, sucursal_id)
SELECT u.empresa_id, u.id, '00000000-0000-4000-8000-000000000002'
FROM public.usuarios AS u
WHERE u.empresa_id = '00000000-0000-4000-8000-000000000001'
ON CONFLICT (empresa_id, usuario_id, sucursal_id) DO NOTHING;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.productos
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.productos
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT productos_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_empresa_id
  ON public.productos (empresa_id, id);
DROP INDEX IF EXISTS public.ux_productos_ref_talla;
CREATE UNIQUE INDEX ux_productos_ref_talla
  ON public.productos (empresa_id, clave_referencia, clave_talla);
DROP INDEX IF EXISTS public.ux_productos_codigo_barras;
CREATE UNIQUE INDEX ux_productos_codigo_barras
  ON public.productos (empresa_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_empresa_activo
  ON public.productos (empresa_id, activo, cantidad);

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.ventas
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.ventas
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT ventas_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_empresa_id
  ON public.ventas (empresa_id, id);
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_empresa_producto_fkey
    FOREIGN KEY (empresa_id, producto_id)
    REFERENCES public.productos(empresa_id, id) ON DELETE RESTRICT;
DROP INDEX IF EXISTS public.ux_ventas_idem;
CREATE UNIQUE INDEX ux_ventas_idem
  ON public.ventas (empresa_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
DROP INDEX IF EXISTS public.ux_ventas_clave_idempotencia;
CREATE UNIQUE INDEX ux_ventas_clave_idempotencia
  ON public.ventas (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha
  ON public.ventas (empresa_id, fecha_venta DESC, id DESC);

ALTER TABLE public.eventos_inventario
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.eventos_inventario
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.eventos_inventario
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT eventos_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT eventos_empresa_producto_fkey
    FOREIGN KEY (empresa_id, producto_id)
    REFERENCES public.productos(empresa_id, id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_eventos_empresa_producto
  ON public.eventos_inventario (empresa_id, producto_id, created_at DESC);

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.proveedores
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.proveedores
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT proveedores_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_empresa_id
  ON public.proveedores (empresa_id, id);
DROP INDEX IF EXISTS public.ux_proveedores_identificacion;
CREATE UNIQUE INDEX ux_proveedores_identificacion
  ON public.proveedores (empresa_id, lower(btrim(identificacion)))
  WHERE identificacion IS NOT NULL AND btrim(identificacion) <> '';

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.clientes
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.clientes
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT clientes_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_clientes_empresa_id
  ON public.clientes (empresa_id, id);
DROP INDEX IF EXISTS public.ux_clientes_identificacion;
CREATE UNIQUE INDEX ux_clientes_identificacion
  ON public.clientes (empresa_id, lower(btrim(identificacion)))
  WHERE identificacion IS NOT NULL AND btrim(identificacion) <> '';
ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_empresa_cliente_fkey
    FOREIGN KEY (empresa_id, cliente_id)
    REFERENCES public.clientes(empresa_id, id) ON DELETE RESTRICT;

ALTER TABLE public.pagos_venta
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.pagos_venta
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.pagos_venta
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT pagos_venta_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT pagos_venta_empresa_venta_fkey
    FOREIGN KEY (empresa_id, venta_id)
    REFERENCES public.ventas(empresa_id, id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_pagos_venta_empresa_id
  ON public.pagos_venta (empresa_id, id);

ALTER TABLE public.cuentas_por_cobrar
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.cuentas_por_cobrar
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.cuentas_por_cobrar
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT cuentas_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT cuentas_empresa_venta_fkey
    FOREIGN KEY (empresa_id, venta_id)
    REFERENCES public.ventas(empresa_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT cuentas_empresa_cliente_fkey
    FOREIGN KEY (empresa_id, cliente_id)
    REFERENCES public.clientes(empresa_id, id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cuentas_empresa_id
  ON public.cuentas_por_cobrar (empresa_id, id);

ALTER TABLE public.abonos
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.abonos
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.abonos
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT abonos_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT abonos_empresa_cuenta_fkey
    FOREIGN KEY (empresa_id, cuenta_id)
    REFERENCES public.cuentas_por_cobrar(empresa_id, id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_abonos_empresa_id
  ON public.abonos (empresa_id, id);
ALTER TABLE public.abonos DROP CONSTRAINT IF EXISTS abonos_clave_idempotencia_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_abonos_empresa_clave_idempotencia
  ON public.abonos (empresa_id, clave_idempotencia);

ALTER TABLE public.cajas
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.cajas
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.cajas
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT cajas_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cajas_empresa_id
  ON public.cajas (empresa_id, id);
DROP INDEX IF EXISTS public.ux_cajas_una_abierta;
CREATE UNIQUE INDEX ux_cajas_una_abierta
  ON public.cajas (empresa_id)
  WHERE estado = 'ABIERTA';
ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_clave_apertura_key;
ALTER TABLE public.cajas DROP CONSTRAINT IF EXISTS cajas_clave_cierre_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cajas_empresa_clave_apertura
  ON public.cajas (empresa_id, clave_apertura)
  WHERE clave_apertura IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cajas_empresa_clave_cierre
  ON public.cajas (empresa_id, clave_cierre)
  WHERE clave_cierre IS NOT NULL;

ALTER TABLE public.caja_movimientos
  ADD COLUMN IF NOT EXISTS empresa_id UUID;
UPDATE public.caja_movimientos
SET empresa_id = '00000000-0000-4000-8000-000000000001'
WHERE empresa_id IS NULL;
ALTER TABLE public.caja_movimientos
  ALTER COLUMN empresa_id SET NOT NULL,
  ADD CONSTRAINT caja_movimientos_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT caja_movimientos_empresa_caja_fkey
    FOREIGN KEY (empresa_id, caja_id)
    REFERENCES public.cajas(empresa_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT caja_movimientos_empresa_pago_fkey
    FOREIGN KEY (empresa_id, pago_venta_id)
    REFERENCES public.pagos_venta(empresa_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT caja_movimientos_empresa_abono_fkey
    FOREIGN KEY (empresa_id, abono_id)
    REFERENCES public.abonos(empresa_id, id) ON DELETE RESTRICT;
ALTER TABLE public.caja_movimientos
  DROP CONSTRAINT IF EXISTS caja_movimientos_pago_venta_id_key,
  DROP CONSTRAINT IF EXISTS caja_movimientos_abono_id_key,
  DROP CONSTRAINT IF EXISTS caja_movimientos_clave_idempotencia_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_caja_movimientos_empresa_pago
  ON public.caja_movimientos (empresa_id, pago_venta_id)
  WHERE pago_venta_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_caja_movimientos_empresa_abono
  ON public.caja_movimientos (empresa_id, abono_id)
  WHERE abono_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_caja_movimientos_empresa_clave
  ON public.caja_movimientos (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

CREATE OR REPLACE FUNCTION public.empresa_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.empresa_id
  FROM public.usuarios AS u
  WHERE u.auth_ref = auth.uid()::text
    AND u.activo
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.empresa_actual() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.empresa_actual() TO authenticated;

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
      AND u.empresa_id = (SELECT public.empresa_actual())
  )
$$;

DROP POLICY IF EXISTS productos_leer ON public.productos;
CREATE POLICY productos_leer ON public.productos
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.empresa_actual()));

DROP POLICY IF EXISTS ventas_leer ON public.ventas;
CREATE POLICY ventas_leer ON public.ventas
  FOR SELECT TO authenticated
  USING (empresa_id = (SELECT public.empresa_actual()));

DROP POLICY IF EXISTS eventos_leer ON public.eventos_inventario;
CREATE POLICY eventos_leer ON public.eventos_inventario
  FOR SELECT TO authenticated
  USING (
    empresa_id = (SELECT public.empresa_actual())
    AND (SELECT public.es_dueno())
  );

DROP POLICY IF EXISTS usuarios_leer ON public.usuarios;
CREATE POLICY usuarios_leer ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    auth_ref = (SELECT auth.uid())::text
    OR (
      empresa_id = (SELECT public.empresa_actual())
      AND (SELECT public.es_dueno())
    )
  );

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
  p.stock_minimo,
  p.empresa_id
FROM public.productos AS p;

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
  v_empresa uuid := public.empresa_actual();
  v_producto public.productos%ROWTYPE;
  v_id bigint;
  v_venta public.ventas%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_empresa IS NULL THEN
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
    pg_catalog.hashtextextended(v_empresa::text || ':' || p_idem, 0)
  );
  SELECT v.* INTO v_venta
  FROM public.ventas AS v
  WHERE v.empresa_id = v_empresa
    AND v.idempotency_key = p_idem;
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
    AND p.empresa_id = v_empresa
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
  WHERE id = v_producto.id AND empresa_id = v_empresa;

  INSERT INTO public.ventas (
    empresa_id, producto_id, usuario_id, referencia, talla, cantidad,
    precio_venta, costo_unitario, fecha_venta, idempotency_key
  )
  VALUES (
    v_empresa, v_producto.id, v_user, v_producto.referencia, v_producto.talla,
    p_cantidad, p_precio, v_producto.precio_compra,
    (pg_catalog.now() AT TIME ZONE 'America/Bogota')::date, p_idem
  )
  RETURNING id INTO v_id;

  INSERT INTO public.eventos_inventario (empresa_id, producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_empresa, v_producto.id, v_user, 'venta',
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
  v_empresa uuid := public.empresa_actual();
  v_venta public.ventas%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad a devolver debe ser mayor a 0';
  END IF;

  SELECT v.* INTO v_venta
  FROM public.ventas AS v
  WHERE v.id = p_venta_id AND v.empresa_id = v_empresa
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
  WHERE id = p_venta_id AND empresa_id = v_empresa;

  UPDATE public.productos
  SET cantidad = cantidad + p_cantidad,
      updated_at = pg_catalog.now()
  WHERE id = v_venta.producto_id AND empresa_id = v_empresa;

  INSERT INTO public.eventos_inventario (empresa_id, producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_empresa, v_venta.producto_id, v_user, 'devolucion_venta',
    pg_catalog.jsonb_build_object('venta_id', p_venta_id, 'delta', p_cantidad)
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
  v_empresa uuid := public.empresa_actual();
  v_producto public.productos%ROWTYPE;
  v_nuevo integer;
BEGIN
  IF v_user IS NULL OR v_empresa IS NULL THEN
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
    AND p.empresa_id = v_empresa
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
  WHERE id = v_producto.id AND empresa_id = v_empresa;

  INSERT INTO public.eventos_inventario (empresa_id, producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_empresa, v_producto.id, v_user, 'entrada',
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
  v_empresa uuid := public.empresa_actual();
  v_producto public.productos%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_empresa IS NULL OR NOT public.es_dueno() THEN
    RAISE EXCEPTION 'Solo el dueño puede ajustar stock';
  END IF;
  IF p_nueva_cantidad IS NULL OR p_nueva_cantidad < 0
    OR COALESCE(pg_catalog.btrim(p_motivo), '') = '' THEN
    RAISE EXCEPTION 'Cantidad >= 0 y motivo obligatorio';
  END IF;

  SELECT p.* INTO v_producto
  FROM public.productos AS p
  WHERE p.id = p_producto_id AND p.empresa_id = v_empresa
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no existe';
  END IF;

  UPDATE public.productos
  SET cantidad = p_nueva_cantidad,
      updated_at = pg_catalog.now()
  WHERE id = v_producto.id AND empresa_id = v_empresa;

  INSERT INTO public.eventos_inventario (empresa_id, producto_id, usuario_id, tipo, detalle)
  VALUES (
    v_empresa, v_producto.id, v_user, 'ajuste',
    pg_catalog.jsonb_build_object(
      'delta', p_nueva_cantidad - v_producto.cantidad,
      'motivo', pg_catalog.btrim(p_motivo)
    )
  );
END;
$$;

COMMIT;
