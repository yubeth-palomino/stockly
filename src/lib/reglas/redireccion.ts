const ORIGEN_INTERNO = 'https://stockly.local';

export function rutaInternaSegura(destino: string | undefined): string {
  if (!destino || !destino.startsWith('/') || destino.startsWith('//') || destino.includes('\\')) {
    return '/panel';
  }

  try {
    const url = new URL(destino, ORIGEN_INTERNO);
    if (url.origin !== ORIGEN_INTERNO) return '/panel';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/panel';
  }
}
