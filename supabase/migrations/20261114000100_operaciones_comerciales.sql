BEGIN;

DO $$
BEGIN
  IF to_regclass('public.usuarios') IS NULL
     OR to_regclass('public.productos') IS NULL
     OR to_regclass('public.ventas') IS NULL THEN
    RAISE EXCEPTION 'Falta el esquema base de Stockly; no se puede aplicar la migración comercial.';
  END IF;
END;
$$;

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS stock_minimo INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_productos_codigo_barras
  ON public.productos (codigo_barras)
  WHERE codigo_barras IS NOT NULL;

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS clave_idempotencia VARCHAR(120),
  ADD COLUMN IF NOT EXISTS huella_idempotencia VARCHAR(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ventas'::regclass
      AND conname = 'ventas_huella_idempotencia_valida'
  ) THEN
    ALTER TABLE public.ventas
      ADD CONSTRAINT ventas_huella_idempotencia_valida
      CHECK (huella_idempotencia IS NULL OR huella_idempotencia ~ '^[a-f0-9]{64}$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_clave_idempotencia
  ON public.ventas (clave_idempotencia)
  WHERE clave_idempotencia IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.proveedores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(160) NOT NULL,
  identificacion VARCHAR(40),
  contacto       VARCHAR(120),
  telefono       VARCHAR(40),
  correo         VARCHAR(254),
  direccion      VARCHAR(240),
  observaciones  VARCHAR(500),
  activo         BOOLEAN NOT NULL DEFAULT true,
  creado_por     UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proveedores_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_proveedores_identificacion
  ON public.proveedores (lower(btrim(identificacion)))
  WHERE identificacion IS NOT NULL AND btrim(identificacion) <> '';
CREATE INDEX IF NOT EXISTS idx_proveedores_activo_nombre
  ON public.proveedores (activo, nombre);

CREATE TABLE IF NOT EXISTS public.clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         VARCHAR(160) NOT NULL,
  identificacion VARCHAR(40),
  telefono       VARCHAR(40),
  correo         VARCHAR(254),
  direccion      VARCHAR(240),
  observaciones  VARCHAR(500),
  activo         BOOLEAN NOT NULL DEFAULT true,
  creado_por     UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clientes_nombre_minimo CHECK (char_length(btrim(nombre)) >= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_clientes_identificacion
  ON public.clientes (lower(btrim(identificacion)))
  WHERE identificacion IS NOT NULL AND btrim(identificacion) <> '';
CREATE INDEX IF NOT EXISTS idx_clientes_activo_nombre
  ON public.clientes (activo, nombre);

CREATE TABLE IF NOT EXISTS public.pagos_venta (
  id          BIGSERIAL PRIMARY KEY,
  venta_id    BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE RESTRICT,
  metodo      VARCHAR(20) NOT NULL
                CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO')),
  monto       BIGINT NOT NULL CHECK (monto > 0),
  creado_por  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pagos_venta_venta_metodo_unico UNIQUE (venta_id, metodo)
);

CREATE INDEX IF NOT EXISTS idx_pagos_venta_fecha
  ON public.pagos_venta (venta_id, created_at, id);

CREATE TABLE IF NOT EXISTS public.cuentas_por_cobrar (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id            BIGINT NOT NULL UNIQUE REFERENCES public.ventas(id) ON DELETE RESTRICT,
  cliente_id          UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  fecha_vencimiento   DATE,
  creado_por          UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuentas_cliente_fecha
  ON public.cuentas_por_cobrar (cliente_id, fecha_vencimiento, created_at DESC);

CREATE TABLE IF NOT EXISTS public.abonos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id             UUID NOT NULL REFERENCES public.cuentas_por_cobrar(id) ON DELETE RESTRICT,
  monto                 BIGINT NOT NULL CHECK (monto > 0),
  metodo                VARCHAR(20) NOT NULL
                          CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO')),
  clave_idempotencia    VARCHAR(120) NOT NULL UNIQUE,
  huella_idempotencia   VARCHAR(64) NOT NULL
                          CHECK (huella_idempotencia ~ '^[a-f0-9]{64}$'),
  observacion           VARCHAR(300),
  creado_por            UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonos_cuenta_fecha
  ON public.abonos (cuenta_id, created_at, id);

CREATE TABLE IF NOT EXISTS public.cajas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado                VARCHAR(10) NOT NULL CHECK (estado IN ('ABIERTA', 'CERRADA')),
  monto_apertura        BIGINT NOT NULL CHECK (monto_apertura >= 0),
  monto_esperado        BIGINT CHECK (monto_esperado >= 0),
  monto_contado         BIGINT CHECK (monto_contado >= 0),
  diferencia            BIGINT,
  abierta_por           UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  cerrada_por           UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacion_apertura  VARCHAR(300),
  observacion_cierre    VARCHAR(300),
  abierta_en            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cerrada_en            TIMESTAMPTZ,
  CONSTRAINT cajas_cierre_consistente CHECK (
    (estado = 'ABIERTA' AND cerrada_en IS NULL AND monto_esperado IS NULL
      AND monto_contado IS NULL AND diferencia IS NULL)
    OR
    (estado = 'CERRADA' AND cerrada_en IS NOT NULL AND monto_esperado IS NOT NULL
      AND monto_contado IS NOT NULL AND diferencia = monto_contado - monto_esperado)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cajas_una_abierta
  ON public.cajas (estado)
  WHERE estado = 'ABIERTA';
CREATE INDEX IF NOT EXISTS idx_cajas_historial
  ON public.cajas (abierta_en DESC, id DESC)
  WHERE estado = 'CERRADA';

CREATE TABLE IF NOT EXISTS public.caja_movimientos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id               UUID NOT NULL REFERENCES public.cajas(id) ON DELETE RESTRICT,
  tipo                  VARCHAR(7) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO')),
  metodo                VARCHAR(20) NOT NULL
                          CHECK (metodo IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO')),
  monto                 BIGINT NOT NULL CHECK (monto > 0),
  concepto              VARCHAR(240) NOT NULL,
  pago_venta_id         BIGINT UNIQUE REFERENCES public.pagos_venta(id) ON DELETE RESTRICT,
  abono_id              UUID UNIQUE REFERENCES public.abonos(id) ON DELETE RESTRICT,
  clave_idempotencia    VARCHAR(120) UNIQUE,
  creado_por            UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT caja_movimiento_origen_valido CHECK (
    (pago_venta_id IS NOT NULL AND abono_id IS NULL AND clave_idempotencia IS NULL)
    OR (pago_venta_id IS NULL AND abono_id IS NOT NULL AND clave_idempotencia IS NULL)
    OR (pago_venta_id IS NULL AND abono_id IS NULL AND clave_idempotencia IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_caja_movimientos_caja_fecha
  ON public.caja_movimientos (caja_id, created_at, id);

CREATE OR REPLACE FUNCTION public.stockly_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proveedores_updated_at ON public.proveedores;
CREATE TRIGGER trg_proveedores_updated_at BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION public.stockly_actualizar_updated_at();
DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.stockly_actualizar_updated_at();

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_movimientos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.proveedores,
  public.clientes,
  public.pagos_venta,
  public.cuentas_por_cobrar,
  public.abonos,
  public.cajas,
  public.caja_movimientos
FROM anon, authenticated;

COMMIT;
