export interface PgContainerConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionUri: string;
}

export interface RedisContainerConfig {
  host: string;
  port: number;
  connectionUri: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    pgConfig: PgContainerConfig;
    redisConfig: RedisContainerConfig;
  }
}
