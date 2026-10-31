import type { PoolClient } from 'pg';

type DatosEvento = {
  tipo: string;
  productoId?: string;
  usuarioId?: string;
  detalle?: Record<string, unknown>;
};

export async function registrarEvento(tx: PoolClient, datos: DatosEvento): Promise<void> {
  await tx.query(
    `INSERT INTO eventos_inventario (tipo, producto_id, usuario_id, detalle)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [
      datos.tipo,
      datos.productoId ?? null,
      datos.usuarioId ?? null,
      JSON.stringify(datos.detalle ?? {}),
    ],
  );
}
