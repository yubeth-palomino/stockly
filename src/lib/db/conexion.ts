import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';

types.setTypeParser(1082, (valor) => valor);
types.setTypeParser(1114, (valor) => valor);
types.setTypeParser(20, (valor) => Number.parseInt(valor, 10));

declare global {
  var poolStockly: Pool | undefined;
}

function obtenerConfiguracionPool() {
  const variableConexion =
    process.env.NODE_ENV !== 'production' && process.env.STOCKLY_POSTGRES_URL_NON_POOLING
      ? 'STOCKLY_POSTGRES_URL_NON_POOLING'
      : 'STOCKLY_POSTGRES_URL';
  const cadenaConexion = process.env[variableConexion];
  if (!cadenaConexion) {
    throw new Error(`Falta la variable ${variableConexion}.`);
  }

  const url = new URL(cadenaConexion);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

export const pool =
  globalThis.poolStockly ??
  new Pool({
    ...obtenerConfiguracionPool(),
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.poolStockly = pool;
}

export async function consultar<T extends QueryResultRow>(
  sql: string,
  valores: unknown[] = [],
): Promise<T[]> {
  const resultado = await pool.query<T>(sql, valores);
  return resultado.rows;
}

export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch (errorRollback) {
      throw new AggregateError(
        [error, errorRollback],
        'Falló la transacción y tampoco se pudo revertir.',
      );
    }
    throw error;
  } finally {
    cliente.release();
  }
}
