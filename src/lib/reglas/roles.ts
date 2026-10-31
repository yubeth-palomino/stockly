export type Rol = 'trabajador' | 'dueno';

export function esDueno(rol: Rol): boolean {
  return rol === 'dueno';
}

export function puedeVerEconomia(rol: Rol): boolean {
  return esDueno(rol);
}
