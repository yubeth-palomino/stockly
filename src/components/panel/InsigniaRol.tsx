import { Insignia } from '@/components/ui/Insignia';
import type { Rol } from '@/lib/reglas/roles';

export function InsigniaRol({ rol }: { rol: Rol }) {
  return (
    <Insignia tono={rol === 'dueno' ? 'dueno' : 'primario'}>
      {rol === 'dueno' ? 'Dueño' : 'Trabajador'}
    </Insignia>
  );
}
