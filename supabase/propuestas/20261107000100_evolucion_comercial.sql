-- PROPUESTA NO EJECUTABLE AUTOMATICAMENTE.
-- No mover a supabase/migrations ni ejecutar sin respaldo verificado y aprobacion.
-- El runner scripts/migrar.mjs solo lee supabase/migrations.
--
-- Expande el esquema actual sin borrar tablas ni filas legadas.
-- Las ventas legadas se importan con costo historico NULL: la base no conserva
-- el costo que tenia cada unidad al momento de esas ventas.

DO $$
BEGIN
  IF to_regclass('public.usuarios') IS NULL
     OR to_regclass('public.productos') IS NULL
     OR to_regclass('public.ventas') IS NULL
     OR to_regclass('public.eventos_inventario') IS NULL THEN
    RAISE EXCEPTION 'No se encuentra el esquema Stockly esperado; detener la migracion.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM productos
    GROUP BY upper(regexp_replace(btrim(referencia), '[[:space:]]+', '', 'g'))
    HAVING count(DISTINCT lower(btrim(marca))) > 1
        OR count(DISTINCT btrim(descripcion)) > 1
  ) THEN
    RAISE EXCEPTION
      'Una referencia tiene marcas o descripciones distintas; resolver el catalogo antes del backfill.';
  END IF;
END;
$$;

CREATE TABLE empresas (
  id          UUID PRIMARY KEY,
  nombre      VARCHAR(160) NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT empresas_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);

CREATE TABLE sucursales (
  id          UUID PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre      VARCHAR(120) NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sucursales_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT sucursales_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2),
  CONSTRAINT sucursales_nombre_unico UNIQUE (empresa_id, nombre)
);

INSERT INTO empresas (id, nombre)
VALUES ('00000000-0000-4000-8000-000000000001', 'Empresa inicial (por configurar)');

INSERT INTO sucursales (id, empresa_id, nombre)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Sucursal principal (por configurar)'
);

CREATE TABLE empresas_usuarios (
  empresa_id             UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  usuario_id             UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  rol                    VARCHAR(12) NOT NULL CHECK (rol IN ('dueno', 'trabajador')),
  alcance_sucursales     VARCHAR(12) NOT NULL CHECK (alcance_sucursales IN ('todas', 'asignadas')),
  activo                 BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, usuario_id)
);

CREATE TABLE usuarios_sucursales (
  empresa_id    UUID NOT NULL,
  usuario_id    UUID NOT NULL,
  sucursal_id   UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, usuario_id, sucursal_id),
  FOREIGN KEY (empresa_id, usuario_id)
    REFERENCES empresas_usuarios(empresa_id, usuario_id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES sucursales(empresa_id, id) ON DELETE RESTRICT
);

INSERT INTO empresas_usuarios (empresa_id, usuario_id, rol, alcance_sucursales, activo)
SELECT '00000000-0000-4000-8000-000000000001',
       id,
       rol,
       CASE WHEN rol = 'dueno' THEN 'todas' ELSE 'asignadas' END,
       activo
FROM usuarios;

INSERT INTO usuarios_sucursales (empresa_id, usuario_id, sucursal_id)
SELECT '00000000-0000-4000-8000-000000000001',
       id,
       '00000000-0000-4000-8000-000000000002'
FROM usuarios;

CREATE TABLE productos_catalogo (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
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

INSERT INTO productos_catalogo (empresa_id, referencia, marca, descripcion, activo)
SELECT '00000000-0000-4000-8000-000000000001',
       min(referencia),
       min(marca),
       min(descripcion),
       bool_or(activo)
FROM productos
GROUP BY upper(regexp_replace(btrim(referencia), '[[:space:]]+', '', 'g'));

CREATE TABLE variantes_producto (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL,
  producto_id          UUID NOT NULL,
  producto_legado_id   UUID UNIQUE REFERENCES productos(id) ON DELETE RESTRICT,
  sku                  VARCHAR(80),
  talla                VARCHAR(20) NOT NULL,
  color                VARCHAR(60),
  codigo_barras        VARCHAR(80),
  precio_venta         INTEGER NOT NULL CHECK (precio_venta > 0),
  activa               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT variantes_producto_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT variantes_producto_catalogo_fk
    FOREIGN KEY (empresa_id, producto_id)
    REFERENCES productos_catalogo(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT variantes_producto_talla_minima CHECK (char_length(btrim(talla)) >= 1)
);

CREATE UNIQUE INDEX ux_variantes_sku_empresa
  ON variantes_producto (
    empresa_id,
    upper(regexp_replace(btrim(sku), '[[:space:]]+', '', 'g'))
  )
  WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX ux_variantes_codigo_barras_empresa
  ON variantes_producto (
    empresa_id,
    upper(regexp_replace(btrim(codigo_barras), '[[:space:]]+', '', 'g'))
  )
  WHERE codigo_barras IS NOT NULL;
CREATE UNIQUE INDEX ux_variantes_catalogo_talla_color
  ON variantes_producto (
    empresa_id,
    producto_id,
    upper(regexp_replace(btrim(talla), '[[:space:]]+', '', 'g')),
    coalesce(upper(regexp_replace(btrim(color), '[[:space:]]+', ' ', 'g')), '')
  );
CREATE INDEX idx_variantes_catalogo ON variantes_producto (empresa_id, producto_id, activa);

INSERT INTO variantes_producto (
  empresa_id, producto_id, producto_legado_id, talla, precio_venta, activa
)
SELECT '00000000-0000-4000-8000-000000000001',
       catalogo.id,
       producto.id,
       producto.talla,
       producto.precio_venta,
       producto.activo
FROM productos AS producto
JOIN productos_catalogo AS catalogo
  ON catalogo.empresa_id = '00000000-0000-4000-8000-000000000001'
 AND catalogo.clave_ref =
     upper(regexp_replace(btrim(producto.referencia), '[[:space:]]+', '', 'g'));

CREATE TABLE existencias (
  empresa_id                 UUID NOT NULL,
  sucursal_id                UUID NOT NULL,
  variante_id                UUID NOT NULL,
  cantidad                   INTEGER NOT NULL DEFAULT 0,
  costo_promedio_unitario    INTEGER,
  costo_promedio_validado    BOOLEAN NOT NULL DEFAULT false,
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, sucursal_id, variante_id),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES sucursales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_id)
    REFERENCES variantes_producto(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT existencias_cantidad_no_negativa CHECK (cantidad >= 0),
  CONSTRAINT existencias_costo_positivo
    CHECK (costo_promedio_unitario IS NULL OR costo_promedio_unitario > 0),
  CONSTRAINT existencias_costo_validado_disponible
    CHECK (NOT costo_promedio_validado OR costo_promedio_unitario IS NOT NULL)
);

INSERT INTO existencias (
  empresa_id, sucursal_id, variante_id, cantidad, costo_promedio_unitario,
  costo_promedio_validado
)
SELECT '00000000-0000-4000-8000-000000000001',
       '00000000-0000-4000-8000-000000000002',
       variante.id,
       producto.cantidad,
       producto.precio_compra,
       false
FROM productos AS producto
JOIN variantes_producto AS variante ON variante.producto_legado_id = producto.id;

CREATE TABLE movimientos_inventario (
  id                  BIGSERIAL PRIMARY KEY,
  empresa_id          UUID NOT NULL,
  sucursal_id         UUID NOT NULL,
  variante_id         UUID NOT NULL,
  usuario_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo                VARCHAR(32) NOT NULL CHECK (
    tipo IN (
      'SALDO_INICIAL_MIGRACION',
      'ENTRADA_COMPRA',
      'VENTA',
      'DEVOLUCION',
      'AJUSTE',
      'CAMBIO'
    )
  ),
  cantidad_anterior   BIGINT NOT NULL CHECK (cantidad_anterior >= 0),
  cantidad_delta      BIGINT NOT NULL,
  cantidad_nueva      BIGINT NOT NULL CHECK (cantidad_nueva >= 0),
  costo_unitario      BIGINT,
  motivo              VARCHAR(300),
  origen_tipo         VARCHAR(32),
  origen_id           TEXT,
  clave_idempotencia  VARCHAR(120),
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id, variante_id)
    REFERENCES existencias(empresa_id, sucursal_id, variante_id) ON DELETE RESTRICT,
  CONSTRAINT movimientos_cantidad_consistente
    CHECK (cantidad_anterior + cantidad_delta = cantidad_nueva),
  CONSTRAINT movimientos_costo_no_negativo
    CHECK (costo_unitario IS NULL OR costo_unitario >= 0)
);

CREATE UNIQUE INDEX ux_movimientos_idempotencia
  ON movimientos_inventario (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;
CREATE INDEX idx_movimientos_existencia_fecha
  ON movimientos_inventario (empresa_id, sucursal_id, variante_id, creado_en DESC, id DESC);

INSERT INTO movimientos_inventario (
  empresa_id, sucursal_id, variante_id, tipo,
  cantidad_anterior, cantidad_delta, cantidad_nueva,
  costo_unitario, origen_tipo, origen_id
)
SELECT '00000000-0000-4000-8000-000000000001',
       '00000000-0000-4000-8000-000000000002',
       variante.id,
       'SALDO_INICIAL_MIGRACION',
       0,
       producto.cantidad,
       producto.cantidad,
       producto.precio_compra,
       'productos',
       producto.id::text
FROM productos AS producto
JOIN variantes_producto AS variante ON variante.producto_legado_id = producto.id;

CREATE FUNCTION rechazar_cambios_movimiento_inventario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Los movimientos de inventario son inmutables; registre un movimiento compensatorio.';
END;
$$;

CREATE TRIGGER trg_movimientos_inventario_inmutables
BEFORE UPDATE OR DELETE ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION rechazar_cambios_movimiento_inventario();

CREATE TABLE proveedores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  nombre       VARCHAR(160) NOT NULL,
  identificacion VARCHAR(40),
  telefono     VARCHAR(40),
  correo       VARCHAR(254),
  activo       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proveedores_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT proveedores_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);
CREATE INDEX idx_proveedores_empresa_activo ON proveedores (empresa_id, activo, nombre);

CREATE TABLE compras (
  id              BIGSERIAL PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id     UUID NOT NULL,
  proveedor_id    UUID NOT NULL,
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  estado          VARCHAR(12) NOT NULL DEFAULT 'BORRADOR'
                  CHECK (estado IN ('BORRADOR', 'RECIBIDA', 'ANULADA')),
  fecha_compra    DATE NOT NULL,
  referencia     VARCHAR(100),
  total           BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0),
  clave_idempotencia VARCHAR(120),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES sucursales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, proveedor_id)
    REFERENCES proveedores(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT compras_empresa_id_id_key UNIQUE (empresa_id, id)
);
CREATE UNIQUE INDEX ux_compras_idempotencia
  ON compras (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;
CREATE INDEX idx_compras_empresa_fecha ON compras (empresa_id, fecha_compra DESC, id DESC);

CREATE TABLE compras_detalle (
  id                    BIGSERIAL PRIMARY KEY,
  empresa_id            UUID NOT NULL,
  compra_id             BIGINT NOT NULL,
  numero_linea          INTEGER NOT NULL CHECK (numero_linea > 0),
  variante_id           UUID NOT NULL,
  cantidad              INTEGER NOT NULL CHECK (cantidad > 0),
  costo_unitario        BIGINT NOT NULL CHECK (costo_unitario > 0),
  descuento_linea       BIGINT NOT NULL DEFAULT 0 CHECK (descuento_linea >= 0),
  FOREIGN KEY (empresa_id, compra_id)
    REFERENCES compras(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_id)
    REFERENCES variantes_producto(empresa_id, id) ON DELETE RESTRICT,
  UNIQUE (empresa_id, compra_id, numero_linea),
  CONSTRAINT compras_detalle_descuento_no_supera_total
    CHECK (descuento_linea::numeric <= costo_unitario::numeric * cantidad::numeric)
);
CREATE INDEX idx_compras_detalle_variante ON compras_detalle (variante_id, compra_id);

CREATE TABLE ventas_comerciales (
  id                    BIGSERIAL PRIMARY KEY,
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id           UUID NOT NULL,
  usuario_id            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre        VARCHAR(120),
  venta_legada_id       BIGINT UNIQUE REFERENCES ventas(id) ON DELETE RESTRICT,
  estado                VARCHAR(20) NOT NULL
                        CHECK (estado IN ('COMPLETADA', 'HISTORICA_LEGACY')),
  fecha_venta           DATE NOT NULL,
  total_bruto           BIGINT NOT NULL CHECK (total_bruto >= 0),
  descuento_total       BIGINT NOT NULL DEFAULT 0 CHECK (descuento_total >= 0),
  clave_idempotencia    VARCHAR(120),
  huella_idempotencia   VARCHAR(64),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES sucursales(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT ventas_comerciales_descuento_no_supera_total
    CHECK (descuento_total <= total_bruto),
  CONSTRAINT ventas_comerciales_huella_valida
    CHECK (huella_idempotencia IS NULL OR huella_idempotencia ~ '^[a-f0-9]{64}$'),
  CONSTRAINT ventas_comerciales_empresa_id_id_key UNIQUE (empresa_id, id)
);
CREATE UNIQUE INDEX ux_ventas_comerciales_idempotencia
  ON ventas_comerciales (empresa_id, clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;
CREATE INDEX idx_ventas_comerciales_empresa_fecha
  ON ventas_comerciales (empresa_id, sucursal_id, fecha_venta DESC, id DESC);

CREATE TABLE ventas_comerciales_detalle (
  id                         BIGSERIAL PRIMARY KEY,
  empresa_id                 UUID NOT NULL,
  venta_id                   BIGINT NOT NULL,
  numero_linea               INTEGER NOT NULL CHECK (numero_linea > 0),
  variante_id                UUID NOT NULL,
  referencia_snapshot        VARCHAR(60) NOT NULL,
  talla_snapshot             VARCHAR(20) NOT NULL,
  color_snapshot             VARCHAR(60),
  cantidad                   INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario            BIGINT NOT NULL CHECK (precio_unitario > 0),
  descuento_linea            BIGINT NOT NULL DEFAULT 0 CHECK (descuento_linea >= 0),
  costo_unitario_historico   BIGINT,
  estado_costo_historico     VARCHAR(20) NOT NULL
                             CHECK (estado_costo_historico IN ('REGISTRADO', 'NO_REGISTRADO')),
  FOREIGN KEY (empresa_id, venta_id)
    REFERENCES ventas_comerciales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_id)
    REFERENCES variantes_producto(empresa_id, id) ON DELETE RESTRICT,
  UNIQUE (empresa_id, venta_id, numero_linea),
  CONSTRAINT ventas_detalle_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT ventas_detalle_descuento_no_supera_total
    CHECK (descuento_linea::numeric <= precio_unitario::numeric * cantidad::numeric),
  CONSTRAINT ventas_detalle_costo_consistente
    CHECK (
      (estado_costo_historico = 'REGISTRADO' AND costo_unitario_historico IS NOT NULL)
      OR
      (estado_costo_historico = 'NO_REGISTRADO' AND costo_unitario_historico IS NULL)
    ),
  CONSTRAINT ventas_detalle_costo_no_negativo
    CHECK (costo_unitario_historico IS NULL OR costo_unitario_historico >= 0)
);
CREATE INDEX idx_ventas_detalle_variante ON ventas_comerciales_detalle (variante_id, venta_id);

INSERT INTO ventas_comerciales (
  empresa_id, sucursal_id, usuario_id, usuario_nombre, venta_legada_id,
  estado, fecha_venta, total_bruto, descuento_total, created_at
)
SELECT '00000000-0000-4000-8000-000000000001',
       '00000000-0000-4000-8000-000000000002',
       venta.usuario_id,
       usuario.nombre,
       venta.id,
       'HISTORICA_LEGACY',
       venta.fecha_venta,
       venta.precio_venta::bigint * venta.cantidad::bigint,
       0,
       venta.created_at
FROM ventas AS venta
LEFT JOIN usuarios AS usuario ON usuario.id = venta.usuario_id;

INSERT INTO ventas_comerciales_detalle (
  empresa_id, venta_id, numero_linea, variante_id, referencia_snapshot,
  talla_snapshot, cantidad, precio_unitario, descuento_linea,
  costo_unitario_historico, estado_costo_historico
)
SELECT comercial.empresa_id,
       comercial.id,
       1,
       variante.id,
       venta.referencia,
       venta.talla,
       venta.cantidad,
       venta.precio_venta,
       0,
       NULL,
       'NO_REGISTRADO'
FROM ventas AS venta
JOIN ventas_comerciales AS comercial ON comercial.venta_legada_id = venta.id
JOIN variantes_producto AS variante ON variante.producto_legado_id = venta.producto_id;

CREATE TABLE pagos_venta (
  id             BIGSERIAL PRIMARY KEY,
  empresa_id     UUID NOT NULL,
  venta_id       BIGINT NOT NULL,
  metodo         VARCHAR(20) NOT NULL
                 CHECK (metodo IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO')),
  monto          BIGINT NOT NULL CHECK (monto > 0),
  referencia     VARCHAR(120),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, venta_id)
    REFERENCES ventas_comerciales(empresa_id, id) ON DELETE RESTRICT
);
CREATE INDEX idx_pagos_venta ON pagos_venta (empresa_id, venta_id, creado_en, id);

CREATE FUNCTION rechazar_cambios_venta_comercial()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Las ventas y sus pagos son inmutables; registre una operación compensatoria.';
END;
$$;

CREATE TRIGGER trg_ventas_comerciales_inmutables
BEFORE UPDATE OR DELETE ON ventas_comerciales
FOR EACH ROW EXECUTE FUNCTION rechazar_cambios_venta_comercial();
CREATE TRIGGER trg_ventas_comerciales_detalle_inmutable
BEFORE UPDATE OR DELETE ON ventas_comerciales_detalle
FOR EACH ROW EXECUTE FUNCTION rechazar_cambios_venta_comercial();
CREATE TRIGGER trg_pagos_venta_inmutables
BEFORE UPDATE OR DELETE ON pagos_venta
FOR EACH ROW EXECUTE FUNCTION rechazar_cambios_venta_comercial();

CREATE TABLE devoluciones (
  id                     BIGSERIAL PRIMARY KEY,
  empresa_id             UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id            UUID NOT NULL,
  venta_original_id      BIGINT NOT NULL,
  venta_reemplazo_id     BIGINT,
  usuario_id             UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo                   VARCHAR(12) NOT NULL CHECK (tipo IN ('DEVOLUCION', 'CAMBIO')),
  motivo                 VARCHAR(300) NOT NULL,
  fecha                  DATE NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES sucursales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, venta_original_id)
    REFERENCES ventas_comerciales(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, venta_reemplazo_id)
    REFERENCES ventas_comerciales(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT devoluciones_empresa_id_id_key UNIQUE (empresa_id, id),
  CONSTRAINT devolucion_motivo_minimo CHECK (char_length(btrim(motivo)) >= 3)
);

CREATE TABLE devoluciones_detalle (
  id                          BIGSERIAL PRIMARY KEY,
  empresa_id                  UUID NOT NULL,
  devolucion_id               BIGINT NOT NULL,
  venta_detalle_id            BIGINT NOT NULL,
  cantidad                    INTEGER NOT NULL CHECK (cantidad > 0),
  reintegra_existencia        BOOLEAN NOT NULL,
  variante_reemplazo_id       UUID,
  FOREIGN KEY (empresa_id, devolucion_id)
    REFERENCES devoluciones(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, venta_detalle_id)
    REFERENCES ventas_comerciales_detalle(empresa_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (empresa_id, variante_reemplazo_id)
    REFERENCES variantes_producto(empresa_id, id) ON DELETE RESTRICT
);
CREATE INDEX idx_devoluciones_venta ON devoluciones (venta_original_id, fecha DESC, id DESC);

CREATE TABLE gastos (
  id             BIGSERIAL PRIMARY KEY,
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  sucursal_id    UUID NOT NULL,
  usuario_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  categoria      VARCHAR(80) NOT NULL,
  descripcion    VARCHAR(240) NOT NULL,
  monto          BIGINT NOT NULL CHECK (monto > 0),
  fecha           DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (empresa_id, sucursal_id)
    REFERENCES sucursales(empresa_id, id) ON DELETE RESTRICT,
  CONSTRAINT gastos_categoria_minima CHECK (char_length(btrim(categoria)) >= 2),
  CONSTRAINT gastos_descripcion_minima CHECK (char_length(btrim(descripcion)) >= 2)
);
CREATE INDEX idx_gastos_empresa_fecha ON gastos (empresa_id, sucursal_id, fecha DESC, id DESC);

-- Este ledger de eventos conserva su historial aunque un producto se desactive.
ALTER TABLE eventos_inventario
  DROP CONSTRAINT IF EXISTS eventos_inventario_producto_id_fkey;
ALTER TABLE eventos_inventario
  ADD CONSTRAINT eventos_inventario_producto_id_fkey
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT;

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_comerciales_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoluciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  empresas,
  sucursales,
  empresas_usuarios,
  usuarios_sucursales,
  productos_catalogo,
  variantes_producto,
  existencias,
  movimientos_inventario,
  proveedores,
  compras,
  compras_detalle,
  ventas_comerciales,
  ventas_comerciales_detalle,
  pagos_venta,
  devoluciones,
  devoluciones_detalle,
  gastos
FROM anon, authenticated;

REVOKE ALL ON SEQUENCE
  movimientos_inventario_id_seq,
  compras_id_seq,
  compras_detalle_id_seq,
  ventas_comerciales_id_seq,
  ventas_comerciales_detalle_id_seq,
  pagos_venta_id_seq,
  devoluciones_id_seq,
  devoluciones_detalle_id_seq,
  gastos_id_seq
FROM anon, authenticated;
