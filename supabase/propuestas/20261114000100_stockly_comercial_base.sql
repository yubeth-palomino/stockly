-- P13: base comercial de Stockly (migración segura y compatible con el esquema actual)
-- La migración no borra registros legados ni sobrescribe ventas históricas.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.usuarios') IS NULL
     OR to_regclass('public.productos') IS NULL
     OR to_regclass('public.ventas') IS NULL
     OR to_regclass('public.eventos_inventario') IS NULL THEN
    RAISE EXCEPTION 'Falta el esquema base de Stockly; no se puede aplicar la migración comercial.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.productos
    GROUP BY upper(regexp_replace(btrim(referencia), '[[:space:]]+', '', 'g'))
    HAVING count(DISTINCT lower(btrim(marca))) > 1
        OR count(DISTINCT btrim(descripcion)) > 1
  ) THEN
    RAISE EXCEPTION 'La referencia de producto tiene marcas o descripciones distintas; resolver antes de migrar.';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.empresas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     VARCHAR(160) NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT empresas_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);

INSERT INTO public.empresas (id, nombre)
VALUES ('00000000-0000-4000-8000-000000000001', 'Empresa inicial (por configurar)')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sucursales (
  id         UUID PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre     VARCHAR(120) NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sucursales_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT sucursales_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2),
  CONSTRAINT sucursales_nombre_unico UNIQUE (empresa_id, nombre)
);

INSERT INTO public.sucursales (id, empresa_id, nombre)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Sucursal principal (por configurar)'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.empresas_usuarios (
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  usuario_id          UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  rol                VARCHAR(12) NOT NULL CHECK (rol IN ('dueno', 'trabajador')),
  alcance_sucursales VARCHAR(12) NOT NULL CHECK (alcance_sucursales IN ('todas', 'asignadas')),
  activo             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS public.usuarios_sucursales (
  empresa_id  UUID NOT NULL,
  usuario_id  UUID NOT NULL,
  sucursal_id UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, usuario_id, sucursal_id),
  FOREIGN KEY (empresa_id, usuario_id)
    REFERENCES public.empresas_usuarios(empresa_id, usuario_id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT
);

INSERT INTO public.empresas_usuarios (empresa_id, usuario_id, rol, alcance_sucursales, activo)
SELECT '00000000-0000-4000-8000-000000000001',
       u.id,
       u.rol,
       CASE WHEN u.rol = 'dueno' THEN 'todas' ELSE 'asignadas' END,
       u.activo
FROM public.usuarios AS u
ON CONFLICT (empresa_id, usuario_id) DO NOTHING;

INSERT INTO public.usuarios_sucursales (empresa_id, usuario_id, sucursal_id)
SELECT '00000000-0000-4000-8000-000000000001',
       u.id,
       '00000000-0000-4000-8000-000000000002'
FROM public.usuarios AS u
ON CONFLICT (empresa_id, usuario_id, sucursal_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.productos_catalogo (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  referencia   VARCHAR(60) NOT NULL,
  clave_ref    VARCHAR(60) GENERATED ALWAYS AS (
    upper(regexp_replace(btrim(referencia), '[[:space:]]+', '', 'g'))
  ) STORED,
  marca        VARCHAR(80) NOT NULL,
  descripcion  VARCHAR(200) NOT NULL,
  categoria    VARCHAR(100),
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_catalogo_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT productos_catalogo_empresa_ref_key UNIQUE (empresa_id, clave_ref),
  CONSTRAINT productos_catalogo_referencia_minima CHECK (char_length(btrim(referencia)) >= 1)
);

INSERT INTO public.productos_catalogo (empresa_id, referencia, marca, descripcion, activo)
SELECT
  '00000000-0000-4000-8000-000000000001' AS empresa_id,
  base.referencia,
  base.marca,
  base.descripcion,
  bool_or(base.activo) AS activo
FROM (
  SELECT
    p.referencia,
    p.marca,
    p.descripcion,
    p.activo,
    upper(regexp_replace(btrim(p.referencia), '[[:space:]]+', '', 'g')) AS clave_ref
  FROM public.productos AS p
  GROUP BY p.referencia, p.marca, p.descripcion, p.activo, upper(regexp_replace(btrim(p.referencia), '[[:space:]]+', '', 'g'))
) AS base
GROUP BY base.referencia, base.marca, base.descripcion, bool_or(base.activo)
ON CONFLICT (empresa_id, clave_ref) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.variantes_producto (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id         UUID NOT NULL,
  producto_id        UUID NOT NULL,
  producto_legado_id UUID UNIQUE REFERENCES public.productos(id) ON DELETE RESTRICT,
  sku                VARCHAR(80),
  talla              VARCHAR(20) NOT NULL,
  color              VARCHAR(60),
  codigo_barras      VARCHAR(80),
  precio_venta       INTEGER NOT NULL CHECK (precio_venta > 0),
  activa             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT variantes_producto_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT variantes_producto_catalogo_fk
    FOREIGN KEY (empresa_id, producto_id)
    REFERENCES public.productos_catalogo(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT variantes_producto_talla_minima CHECK (char_length(btrim(talla)) >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_variantes_sku_empresa
  ON public.variantes_producto (
    empresa_id,
    upper(regexp_replace(btrim(sku), '[[:space:]]+', '', 'g'))
  )
  WHERE sku IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_variantes_codigo_barras_empresa
  ON public.variantes_producto (
    empresa_id,
    upper(regexp_replace(btrim(codigo_barras), '[[:space:]]+', '', 'g'))
  )
  WHERE codigo_barras IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_variantes_catalogo_talla_color
  ON public.variantes_producto (
    empresa_id,
    producto_id,
    upper(regexp_replace(btrim(talla), '[[:space:]]+', '', 'g')),
    coalesce(upper(regexp_replace(btrim(color), '[[:space:]]+', ' ', 'g')), '')
  );

CREATE INDEX IF NOT EXISTS idx_variantes_catalogo
  ON public.variantes_producto (empresa_id, producto_id, activa);

INSERT INTO public.variantes_producto (
  empresa_id, producto_id, producto_legado_id, talla, precio_venta, activa
)
SELECT
  '00000000-0000-4000-8000-000000000001' AS empresa_id,
  catalogo.id,
  p.id,
  p.talla,
  p.precio_venta,
  p.activo
FROM public.productos AS p
JOIN public.productos_catalogo AS catalogo
  ON catalogo.empresa_id = '00000000-0000-4000-8000-000000000001'
 AND catalogo.clave_ref = upper(regexp_replace(btrim(p.referencia), '[[:space:]]+', '', 'g'))
WHERE NOT EXISTS (
  SELECT 1
  FROM public.variantes_producto AS existente
  WHERE existente.empresa_id = '00000000-0000-4000-8000-000000000001'
    AND existente.producto_id = catalogo.id
    AND existente.talla = p.talla
);

CREATE TABLE IF NOT EXISTS public.existencias (
  empresa_id              UUID NOT NULL,
  sucursal_id             UUID NOT NULL,
  variante_id             UUID NOT NULL,
  cantidad                INTEGER NOT NULL DEFAULT 0,
  costo_promedio_unitario INTEGER,
  costo_promedio_validado BOOLEAN NOT NULL DEFAULT false,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, sucursal_id, variante_id),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_id)
    REFERENCES public.variantes_producto(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT existencias_cantidad_no_negativa CHECK (cantidad >= 0),
  CONSTRAINT existencias_costo_positivo CHECK (costo_promedio_unitario IS NULL OR costo_promedio_unitario > 0),
  CONSTRAINT existencias_costo_validado_disponible CHECK (NOT costo_promedio_validado OR costo_promedio_unitario IS NOT NULL)
);

INSERT INTO public.existencias (
  empresa_id, sucursal_id, variante_id, cantidad, costo_promedio_unitario, costo_promedio_validado
)
SELECT
  '00000000-0000-4000-8000-000000000001' AS empresa_id,
  '00000000-0000-4000-8000-000000000002' AS sucursal_id,
  v.id AS variante_id,
  p.cantidad,
  p.precio_compra,
  false
FROM public.productos AS p
JOIN public.variantes_producto AS v
  ON v.producto_legado_id = p.id
ON CONFLICT (empresa_id, sucursal_id, variante_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id                 BIGSERIAL PRIMARY KEY,
  empresa_id         UUID NOT NULL,
  sucursal_id        UUID NOT NULL,
  variante_id        UUID NOT NULL,
  usuario_id         UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo               VARCHAR(32) NOT NULL CHECK (
    tipo IN ('SALDO_INICIAL_MIGRACION', 'ENTRADA_COMPRA', 'VENTA', 'DEVOLUCION', 'AJUSTE', 'CAMBIO')
  ),
  cantidad_anterior  BIGINT NOT NULL CHECK (cantidad_anterior >= 0),
  cantidad_delta     BIGINT NOT NULL,
  cantidad_nueva     BIGINT NOT NULL CHECK (cantidad_nueva >= 0),
  costo_unitario     BIGINT,
  motivo             VARCHAR(300),
  origen_tipo        VARCHAR(32),
  origen_id          TEXT,
  clave_idempotencia VARCHAR(120),
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id, variante_id)
    REFERENCES public.existencias(empresa_id, sucursal_id, variante_id) ON DELETE RESTRICT,
  CONSTRAINT movimientos_cantidad_consistente CHECK (cantidad_anterior + cantidad_delta = cantidad_nueva),
  CONSTRAINT movimientos_costo_no_negativo CHECK (costo_unitario IS NULL OR costo_unitario >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_movimientos_idempotencia
  ON public.movimientos_inventario (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_existencia_fecha
  ON public.movimientos_inventario (empresa_id, sucursal_id, variante_id, creado_en DESC, id DESC);

INSERT INTO public.movimientos_inventario (
  empresa_id, sucursal_id, variante_id, tipo,
  cantidad_anterior, cantidad_delta, cantidad_nueva,
  costo_unitario, origen_tipo, origen_id
)
SELECT
  '00000000-0000-4000-8000-000000000001' AS empresa_id,
  '00000000-0000-4000-8000-000000000002' AS sucursal_id,
  v.id AS variante_id,
  'SALDO_INICIAL_MIGRACION',
  0,
  p.cantidad,
  p.cantidad,
  p.precio_compra,
  'productos',
  p.id::text
FROM public.productos AS p
JOIN public.variantes_producto AS v
  ON v.producto_legado_id = p.id
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.proveedores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre         VARCHAR(160) NOT NULL,
  identificacion VARCHAR(40),
  telefono       VARCHAR(40),
  correo         VARCHAR(254),
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proveedores_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT proveedores_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_activo
  ON public.proveedores (empresa_id, activo, nombre);

CREATE TABLE IF NOT EXISTS public.compras (
  id                 BIGSERIAL PRIMARY KEY,
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  sucursal_id        UUID NOT NULL,
  proveedor_id       UUID NOT NULL,
  usuario_id         UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estado             VARCHAR(12) NOT NULL DEFAULT 'BORRADOR'
                       CHECK (estado IN ('BORRADOR', 'RECIBIDA', 'ANULADA')),
  fecha_compra       DATE NOT NULL,
  referencia         VARCHAR(100),
  total              BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0),
  clave_idempotencia VARCHAR(120),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, proveedor_id)
    REFERENCES public.proveedores(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT compras_empresa_id_id_key UNIQUE (empresa_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_compras_idempotencia
  ON public.compras (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compras_empresa_fecha
  ON public.compras (empresa_id, fecha_compra DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.compras_detalle (
  id                    BIGSERIAL PRIMARY KEY,
  empresa_id            UUID NOT NULL,
  compra_id             BIGINT NOT NULL,
  numero_linea          INTEGER NOT NULL CHECK (numero_linea > 0),
  variante_id           UUID NOT NULL,
  cantidad              INTEGER NOT NULL CHECK (cantidad > 0),
  costo_unitario        BIGINT NOT NULL CHECK (costo_unitario > 0),
  descuento_linea       BIGINT NOT NULL DEFAULT 0 CHECK (descuento_linea >= 0),
  FOREIGN KEY (empresa_id, compra_id)
    REFERENCES public.compras(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_id)
    REFERENCES public.variantes_producto(empresa_id, id) ON DELETE RESTRICT,
  UNIQUE (empresa_id, compra_id, numero_linea),
  CONSTRAINT compras_detalle_descuento_no_supera_total
    CHECK (descuento_linea::numeric <= costo_unitario::numeric * cantidad::numeric)
);

CREATE INDEX IF NOT EXISTS idx_compras_detalle_variante
  ON public.compras_detalle (variante_id, compra_id);

CREATE TABLE IF NOT EXISTS public.ventas_comerciales (
  id                   BIGSERIAL PRIMARY KEY,
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  sucursal_id          UUID NOT NULL,
  usuario_id           UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  usuario_nombre       VARCHAR(120),
  venta_legada_id      BIGINT UNIQUE REFERENCES public.ventas(id) ON DELETE RESTRICT,
  estado               VARCHAR(20) NOT NULL CHECK (estado IN ('COMPLETADA', 'HISTORICA_LEGACY')),
  fecha_venta          DATE NOT NULL,
  total_bruto          BIGINT NOT NULL CHECK (total_bruto >= 0),
  descuento_total      BIGINT NOT NULL DEFAULT 0 CHECK (descuento_total >= 0),
  clave_idempotencia   VARCHAR(120),
  huella_idempotencia  VARCHAR(64),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT ventas_comerciales_descuento_no_supera_total CHECK (descuento_total <= total_bruto),
  CONSTRAINT ventas_comerciales_huella_valida CHECK (huella_idempotencia IS NULL OR huella_idempotencia ~ '^[a-f0-9]{64}$'),
  CONSTRAINT ventas_comerciales_empresa_id_id_key UNIQUE (empresa_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_comerciales_idempotencia
  ON public.ventas_comerciales (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_comerciales_empresa_fecha
  ON public.ventas_comerciales (empresa_id, sucursal_id, fecha_venta DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.ventas_comerciales_detalle (
  id                       BIGSERIAL PRIMARY KEY,
  empresa_id               UUID NOT NULL,
  venta_id                 BIGINT NOT NULL,
  numero_linea             INTEGER NOT NULL CHECK (numero_linea > 0),
  variante_id              UUID NOT NULL,
  referencia_snapshot      VARCHAR(60) NOT NULL,
  talla_snapshot           VARCHAR(20) NOT NULL,
  color_snapshot           VARCHAR(60),
  cantidad                 INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario          BIGINT NOT NULL CHECK (precio_unitario > 0),
  descuento_linea          BIGINT NOT NULL DEFAULT 0 CHECK (descuento_linea >= 0),
  costo_unitario_historico BIGINT,
  estado_costo_historico   VARCHAR(20) NOT NULL CHECK (estado_costo_historico IN ('REGISTRADO', 'NO_REGISTRADO')),
  FOREIGN KEY (empresa_id, venta_id)
    REFERENCES public.ventas_comerciales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_id)
    REFERENCES public.variantes_producto(empresa_id, id) ON DELETE RESTRICT,
  UNIQUE (empresa_id, venta_id, numero_linea),
  CONSTRAINT ventas_detalle_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT ventas_detalle_descuento_no_supera_total CHECK (descuento_linea::numeric <= precio_unitario::numeric * cantidad::numeric),
  CONSTRAINT ventas_detalle_costo_consistente CHECK (
    (estado_costo_historico = 'REGISTRADO' AND costo_unitario_historico IS NOT NULL)
    OR (estado_costo_historico = 'NO_REGISTRADO' AND costo_unitario_historico IS NULL)
  ),
  CONSTRAINT ventas_detalle_costo_no_negativo CHECK (costo_unitario_historico IS NULL OR costo_unitario_historico >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ventas_detalle_variante
  ON public.ventas_comerciales_detalle (variante_id, venta_id);

INSERT INTO public.ventas_comerciales (
  empresa_id, sucursal_id, usuario_id, usuario_nombre, venta_legada_id,
  estado, fecha_venta, total_bruto, descuento_total, created_at
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  venta.usuario_id,
  usuario.nombre,
  venta.id,
  'HISTORICA_LEGACY',
  venta.fecha_venta,
  venta.precio_venta::bigint * venta.cantidad::bigint,
  0,
  venta.created_at
FROM public.ventas AS venta
LEFT JOIN public.usuarios AS usuario ON usuario.id = venta.usuario_id
ON CONFLICT (empresa_id, id) DO NOTHING;

INSERT INTO public.ventas_comerciales_detalle (
  empresa_id, venta_id, numero_linea, variante_id, referencia_snapshot,
  talla_snapshot, color_snapshot, cantidad, precio_unitario, descuento_linea,
  costo_unitario_historico, estado_costo_historico
)
SELECT
  comercial.empresa_id,
  comercial.id,
  1,
  variante.id,
  venta.referencia,
  venta.talla,
  NULL,
  venta.cantidad,
  venta.precio_venta,
  0,
  NULL,
  'NO_REGISTRADO'
FROM public.ventas AS venta
JOIN public.ventas_comerciales AS comercial ON comercial.venta_legada_id = venta.id
JOIN public.variantes_producto AS variante ON variante.producto_legado_id = venta.producto_id
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pagos_venta (
  id         BIGSERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL,
  venta_id   BIGINT NOT NULL,
  metodo     VARCHAR(20) NOT NULL CHECK (metodo IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO')),
  monto      BIGINT NOT NULL CHECK (monto > 0),
  referencia VARCHAR(120),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, venta_id)
    REFERENCES public.ventas_comerciales(empresa_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pagos_venta
  ON public.pagos_venta (empresa_id, venta_id, creado_en, id);

CREATE TABLE IF NOT EXISTS public.devoluciones (
  id                BIGSERIAL PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  sucursal_id       UUID NOT NULL,
  venta_original_id BIGINT NOT NULL,
  venta_reemplazo_id BIGINT,
  usuario_id        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo              VARCHAR(12) NOT NULL CHECK (tipo IN ('DEVOLUCION', 'CAMBIO')),
  motivo            VARCHAR(300) NOT NULL,
  fecha             DATE NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, venta_original_id)
    REFERENCES public.ventas_comerciales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, venta_reemplazo_id)
    REFERENCES public.ventas_comerciales(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT devoluciones_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT devolucion_motivo_minimo CHECK (char_length(btrim(motivo)) >= 3)
);

CREATE TABLE IF NOT EXISTS public.devoluciones_detalle (
  id                    BIGSERIAL PRIMARY KEY,
  empresa_id            UUID NOT NULL,
  devolucion_id         BIGINT NOT NULL,
  venta_detalle_id      BIGINT NOT NULL,
  cantidad              INTEGER NOT NULL CHECK (cantidad > 0),
  reintegra_existencia  BOOLEAN NOT NULL,
  variante_reemplazo_id UUID,
  FOREIGN KEY (empresa_id, devolucion_id)
    REFERENCES public.devoluciones(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, venta_detalle_id)
    REFERENCES public.ventas_comerciales_detalle(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_reemplazo_id)
    REFERENCES public.variantes_producto(empresa_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_devoluciones_venta
  ON public.devoluciones (venta_original_id, fecha DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.gastos (
  id          BIGSERIAL PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  sucursal_id UUID NOT NULL,
  usuario_id  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  categoria   VARCHAR(80) NOT NULL,
  descripcion VARCHAR(240) NOT NULL,
  monto       BIGINT NOT NULL CHECK (monto > 0),
  fecha       DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES public.sucursales(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT gastos_categoria_minima CHECK (char_length(btrim(categoria)) >= 2),
  CONSTRAINT gastos_descripcion_minima CHECK (char_length(btrim(descripcion)) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_gastos_empresa_fecha
  ON public.gastos (empresa_id, sucursal_id, fecha DESC, id DESC);

ALTER TABLE public.eventos_inventario
  DROP CONSTRAINT IF EXISTS eventos_inventario_producto_id_fkey;

ALTER TABLE public.eventos_inventario
  ADD CONSTRAINT eventos_inventario_producto_id_fkey
  FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variantes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_comerciales_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devoluciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.empresas,
  public.sucursales,
  public.empresas_usuarios,
  public.usuarios_sucursales,
  public.productos_catalogo,
  public.variantes_producto,
  public.existencias,
  public.movimientos_inventario,
  public.proveedores,
  public.compras,
  public.compras_detalle,
  public.ventas_comerciales,
  public.ventas_comerciales_detalle,
  public.pagos_venta,
  public.devoluciones,
  public.devoluciones_detalle,
  public.gastos
FROM anon, authenticated;

COMMIT;
