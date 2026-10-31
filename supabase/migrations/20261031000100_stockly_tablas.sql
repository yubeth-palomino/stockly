-- M1: tablas del módulo mínimo de Stockly

CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_ref    TEXT          UNIQUE,
  nombre      VARCHAR(120)  NOT NULL,
  usuario     VARCHAR(60)   NOT NULL,
  rol         VARCHAR(12)   NOT NULL CHECK (rol IN ('trabajador', 'dueno')),
  activo      BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_usuario ON usuarios (lower(btrim(usuario)));

CREATE TABLE IF NOT EXISTS productos (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia       VARCHAR(60)   NOT NULL,
  clave_referencia VARCHAR(60)   GENERATED ALWAYS AS (upper(btrim(referencia))) STORED,
  marca            VARCHAR(80)   NOT NULL,
  descripcion      VARCHAR(200)  NOT NULL,
  talla            VARCHAR(20)   NOT NULL,
  clave_talla      VARCHAR(20)   GENERATED ALWAYS AS (upper(btrim(talla))) STORED,
  cantidad         INTEGER       NOT NULL,
  precio_venta     INTEGER       NOT NULL,
  precio_compra    INTEGER,
  fecha_entrada    DATE          NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT productos_cantidad_valida CHECK (cantidad >= 0),
  CONSTRAINT productos_precio_venta_valido CHECK (precio_venta > 0),
  CONSTRAINT productos_precio_compra_valido CHECK (precio_compra IS NULL OR precio_compra > 0),
  CONSTRAINT productos_referencia_minima CHECK (char_length(btrim(referencia)) >= 1),
  CONSTRAINT productos_talla_minima CHECK (char_length(btrim(talla)) >= 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_ref_talla
  ON productos (clave_referencia, clave_talla);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON productos (lower(marca));
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (activo, cantidad);

CREATE TABLE IF NOT EXISTS ventas (
  id              BIGSERIAL     PRIMARY KEY,
  producto_id     UUID          NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  usuario_id      UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  referencia      VARCHAR(60)   NOT NULL,
  talla           VARCHAR(20)   NOT NULL,
  cantidad        INTEGER       NOT NULL,
  precio_venta    INTEGER       NOT NULL,
  fecha_venta     DATE          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ventas_cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT ventas_precio_positivo CHECK (precio_venta > 0)
);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas (producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas (fecha_venta DESC);

CREATE TABLE IF NOT EXISTS eventos_inventario (
  id           BIGSERIAL     PRIMARY KEY,
  producto_id  UUID          REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id   UUID          REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo         VARCHAR(30)   NOT NULL,
  detalle      JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eventos_producto ON eventos_inventario (producto_id, created_at DESC);

CREATE OR REPLACE FUNCTION stockly_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION stockly_actualizar_updated_at();
DROP TRIGGER IF EXISTS trg_productos_updated_at ON productos;
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION stockly_actualizar_updated_at();
