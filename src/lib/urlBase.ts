export function obtenerUrlBase(): string {
  const urlAplicacion = process.env.APP_URL?.trim();
  if (urlAplicacion) return urlAplicacion.replace(/\/+$/, '');

  const urlProduccion = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (process.env.VERCEL_ENV === 'production' && urlProduccion) {
    return `https://${urlProduccion.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  }

  const urlVercel = process.env.VERCEL_URL?.trim();
  if (urlVercel) return `https://${urlVercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}