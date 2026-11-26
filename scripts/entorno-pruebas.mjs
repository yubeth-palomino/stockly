const proyectoStaging = 'vmuwhxxdocujvbolrfhx';
const proyectoProduccion = 'kzjvamlbbberhqdzqqhj';

function obtenerReferencia(urlIngresada) {
  if (!urlIngresada) return null;

  let url;
  try {
    url = new URL(urlIngresada);
  } catch {
    throw new Error('La URL de conexión configurada no es válida.');
  }

  const coincidenciaHost = url.hostname.match(/^(?:db\.)?([a-z0-9]+)\.supabase\.co$/i);
  if (coincidenciaHost?.[1]) return coincidenciaHost[1].toLowerCase();

  let usuario;
  try {
    usuario = decodeURIComponent(url.username);
  } catch {
    throw new Error('La URL de conexión configurada no es válida.');
  }
  const coincidenciaUsuario = usuario.match(/^postgres\.([a-z0-9]+)$/i);
  return coincidenciaUsuario?.[1]?.toLowerCase() ?? null;
}

function variablesConexion(origen) {
  if (origen === 'runtime') {
    if (process.env.VERCEL_ENV === 'preview') {
      return ['STOCKLY_PREVIEW_POSTGRES_URL', 'STOCKLY_PREVIEW_POSTGRES_URL_NON_POOLING'];
    }
    if (process.env.VERCEL === '1') return ['STOCKLY_POSTGRES_URL'];
    return ['STOCKLY_POSTGRES_URL_NON_POOLING', 'STOCKLY_POSTGRES_URL'];
  }

  return [
    'STOCKLY_PREVIEW_POSTGRES_URL_NON_POOLING',
    'STOCKLY_POSTGRES_URL_NON_POOLING',
    'STOCKLY_POSTGRES_URL',
  ];
}

function variableSupabase(usarPreview) {
  if (usarPreview || process.env.VERCEL_ENV === 'preview') {
    return process.env.STOCKLY_PREVIEW_SUPABASE_URL;
  }
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_STOCKLY_STOCKLYSUPABASE_URL ||
    process.env.STOCKLY_SUPABASE_URL ||
    undefined
  );
}

/**
 * @param {{ urlConexion?: string, urlSupabase?: string, entorno?: string }} configuracion
 */
export function validarDestinoDePruebas({ urlConexion, urlSupabase, entorno }) {
  if (!urlConexion) {
    throw new Error('Falta la URL PostgreSQL requerida para esta operación.');
  }

  const referencias = [
    obtenerReferencia(urlConexion),
    obtenerReferencia(urlSupabase),
  ].filter((referencia) => referencia !== null);
  const referenciasUnicas = [...new Set(referencias)];

  if (referenciasUnicas.includes(proyectoProduccion)) {
    throw new Error(
      `Operación bloqueada: la configuración identifica Production (${proyectoProduccion}).`,
    );
  }
  if (referenciasUnicas.length > 1) {
    throw new Error('Operación bloqueada: las URL PostgreSQL y Supabase apuntan a proyectos distintos.');
  }

  const referencia = referenciasUnicas[0];
  if (referencia === proyectoStaging) return;
  if (entorno === 'pruebas') return;

  throw new Error(
    `Destino no autorizado. Usa staging (${proyectoStaging}) o marca explícitamente una BD aislada con STOCKLY_DB_ENTORNO=pruebas.`,
  );
}

/** @param {'cliente' | 'runtime'} [origen='cliente'] */
export function exigirDestinoDePruebas(origen = 'cliente') {
  const nombres = variablesConexion(origen);
  const variableConexion = nombres.find((nombre) => process.env[nombre]);
  const urlConexion = variableConexion ? process.env[variableConexion] : undefined;
  const urlSupabase = variableSupabase(Boolean(variableConexion?.startsWith('STOCKLY_PREVIEW_')));

  validarDestinoDePruebas({
    urlConexion,
    urlSupabase,
    entorno: process.env.STOCKLY_DB_ENTORNO,
  });
}
