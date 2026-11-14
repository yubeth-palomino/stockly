import { Insignia } from '@/components/ui/Insignia';
import type { FilaProducto } from '@/lib/datos/tipos';

export function InsigniaDisponibilidad({
  activo,
  disponible,
  stockBajo = false,
}: Pick<FilaProducto, 'activo' | 'disponible'> & { stockBajo?: boolean }) {
  if (!activo) return <Insignia tono="inactivo">Inactivo</Insignia>;
  if (!disponible) return <Insignia tono="agotado">Agotado</Insignia>;
  if (stockBajo) return <Insignia tono="advertencia">Stock bajo</Insignia>;
  return <Insignia tono="disponible">En stock</Insignia>;
}
