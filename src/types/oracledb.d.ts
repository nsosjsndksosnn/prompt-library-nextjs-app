declare module "oracledb" {
  export const OUT_FORMAT_OBJECT: number;
  export const BIND_OUT: number;
  export const NUMBER: number;
  export const CLOB: number;

  export let outFormat: number;
  export let fetchAsString: number[];

  export type BindParameters = Record<string, unknown>;

  export type ExecuteOptions = {
    autoCommit?: boolean;
  };

  export type Result<T> = {
    rows?: T[];
    outBinds?: Record<string, unknown[]>;
  };

  export type Connection = {
    execute<T = Record<string, unknown>>(
      sql: string,
      binds?: BindParameters,
      options?: ExecuteOptions,
    ): Promise<Result<T>>;
    commit(): Promise<void>;
    close(): Promise<void>;
  };

  export type Pool = {
    getConnection(): Promise<Connection>;
  };

  export function createPool(config: {
    user: string;
    password: string;
    connectString: string;
    poolMin?: number;
    poolMax?: number;
    poolIncrement?: number;
  }): Promise<Pool>;

  const oracledb: {
    OUT_FORMAT_OBJECT: typeof OUT_FORMAT_OBJECT;
    BIND_OUT: typeof BIND_OUT;
    NUMBER: typeof NUMBER;
    CLOB: typeof CLOB;
    outFormat: typeof outFormat;
    fetchAsString: typeof fetchAsString;
    createPool: typeof createPool;
  };

  export default oracledb;
}
