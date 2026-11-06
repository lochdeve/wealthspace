import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';

export type AppEnv = {
  databaseUrl: string;
  port: number;
};

/** Injection token for validated environment (not a string to avoid collisions). */
export const ENV_TOKEN = Symbol('APP_ENV');

const POSTGRES_PROTOCOLS = new Set(['postgresql:', 'postgres:']);

export function loadEnvFiles(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '../../.env'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadEnvFile(path);
    }
  }
}

function validateDatabaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') {
    throw new Error('DATABASE_URL is required');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL must be a valid URL');
  }
  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error('DATABASE_URL must use postgresql:// or postgres://');
  }
  return raw;
}

function parsePort(
  raw: string | undefined,
  fallback: string | undefined,
): number {
  const value = raw ?? fallback ?? '3001';
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid API port: ${value}`);
  }
  return port;
}

export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    databaseUrl: validateDatabaseUrl(source['DATABASE_URL']),
    port: parsePort(source['API_PORT'], source['PORT']),
  };
}
