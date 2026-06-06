import "server-only";
import oracledb from "oracledb";
import type { Connection, Pool } from "oracledb";

let poolPromise: Promise<Pool> | null = null;

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOraclePool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: requireEnv("ORACLE_USER"),
      password: requireEnv("ORACLE_PASSWORD"),
      connectString: requireEnv("ORACLE_CONNECT_STRING"),
      poolMin: 0,
      poolMax: 8,
      poolIncrement: 1,
    });
  }

  return poolPromise;
}

export async function withConnection<T>(
  callback: (connection: Connection) => Promise<T>,
) {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    return await callback(connection);
  } finally {
    await connection.close();
  }
}

export function toDateString(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}
