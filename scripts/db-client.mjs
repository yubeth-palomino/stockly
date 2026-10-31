import pg from 'pg';

const { Client } = pg;

export function crearClienteBaseDatos() {
  const variableConexion = process.env.STOCKLY_POSTGRES_URL_NON_POOLING
    ? 'STOCKLY_POSTGRES_URL_NON_POOLING'
    : 'STOCKLY_POSTGRES_URL';
  const cadenaConexion = process.env[variableConexion];

  if (!cadenaConexion) {
    throw new Error('Configura STOCKLY_POSTGRES_URL_NON_POOLING o STOCKLY_POSTGRES_URL.');
  }

  const url = new URL(cadenaConexion);
  return new Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  });
}
