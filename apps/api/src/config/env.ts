import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile } from 'node:process';
const DEFAULT_AUTH_COOKIE_NAME = 'wealthspace_session';

export type AppEnv = {
  databaseUrl: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtCookieName: string;
  jwtCookieMaxAgeMs: number;
  cookieSecure: boolean;
  /** Browser origin allowed for credentialed CORS (Next.js dev default). */
  webOrigin: string;
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

function validateJwtSecret(raw: string | undefined): string {
  const value = raw?.trim() ?? '';
  if (value.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return value;
}

/** Supports `Nd` day suffix (default auth cookie max-age aligns with JWT expiry). */
export function parseJwtMaxAgeMs(expiresIn: string): number {
  const trimmed = expiresIn.trim();
  const dayMatch = /^(\d+)d$/i.exec(trimmed);
  if (dayMatch !== null) {
    const days = Number.parseInt(dayMatch[1] ?? '', 10);
    if (Number.isInteger(days) && days > 0) {
      return days * 24 * 60 * 60 * 1000;
    }
  }
  throw new Error(
    `JWT_EXPIRES_IN must use a positive day suffix (e.g. 7d): ${expiresIn}`,
  );
}

function validateWebOrigin(raw: string | undefined): string {
  const value = raw?.trim() || 'http://localhost:3000';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`WEB_ORIGIN must be a valid URL: ${value}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('WEB_ORIGIN must use http:// or https://');
  }
  return parsed.origin;
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
  const jwtExpiresIn = source['JWT_EXPIRES_IN']?.trim() || '7d';
  return {
    databaseUrl: validateDatabaseUrl(source['DATABASE_URL']),
    port: parsePort(source['API_PORT'], source['PORT']),
    jwtSecret: validateJwtSecret(source['JWT_SECRET']),
    jwtExpiresIn,
    jwtCookieName:
      source['JWT_COOKIE_NAME']?.trim() || DEFAULT_AUTH_COOKIE_NAME,
    jwtCookieMaxAgeMs: parseJwtMaxAgeMs(jwtExpiresIn),
    cookieSecure: source['NODE_ENV'] === 'production',
    webOrigin: validateWebOrigin(source['WEB_ORIGIN']),
  };
}
