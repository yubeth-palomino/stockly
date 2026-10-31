import { Insignia } from '@/components/ui/Insignia';
import type { FilaProducto } from '@/lib/datos/tipos';

export function InsigniaDisponibilidad({
  activo,
  disponible,
}: Pick<FilaProducto, 'activo' | 'disponible'>) {
  if (!activo) return <Insignia tono="inactivo">Inactivo</Insignia>;
  return disponible ? (
    <Insignia tono="disponible">Disponible</Insignia>
  ) : (
    <Insignia tono="agotado">Agotado</Insignia>
  );
}
