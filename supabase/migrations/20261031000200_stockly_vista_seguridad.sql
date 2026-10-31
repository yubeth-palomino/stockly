-- M2: vista del inventario y cierre de acceso público

CREATE OR REPLACE VIEW v_productos
WITH (security_invoker = true) AS
SELECT
  p.*,
  (p.cantidad > 0) AS disponible
FROM productos p;

ALTER TABLE usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_inventario  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON usuarios, productos, ventas, eventos_inventario FROM anon, authenticated;
REVOKE ALL ON v_productos FROM anon, authenticated;
