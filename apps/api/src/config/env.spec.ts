import { parseEnv } from './env';

describe('parseEnv', () => {
  const jwtSecret = 'abcdefghijklmnopqrstuvwxyz123456';
  const base: NodeJS.ProcessEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/wealthspace',
    API_PORT: '3001',
    JWT_SECRET: jwtSecret,
  };

  it('returns validated config', () => {
    expect(parseEnv(base)).toEqual({
      databaseUrl: base['DATABASE_URL'],
      port: 3001,
      jwtSecret,
      jwtExpiresIn: '7d',
      jwtCookieName: 'wealthspace_session',
      jwtCookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
      cookieSecure: false,
      webOrigin: 'http://localhost:3000',
    });
  });

  it('accepts postgres:// protocol', () => {
    expect(
      parseEnv({ ...base, DATABASE_URL: 'postgres://localhost/db' })
        .databaseUrl,
    ).toContain('postgres://');
  });

  it('falls back to PORT when API_PORT is missing', () => {
    expect(parseEnv({ ...base, API_PORT: undefined, PORT: '4000' }).port).toBe(
      4000,
    );
  });

  it('rejects missing DATABASE_URL', () => {
    expect(() => parseEnv({ API_PORT: '3001', JWT_SECRET: jwtSecret })).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('rejects short JWT_SECRET', () => {
    expect(() => parseEnv({ ...base, JWT_SECRET: 'too-short' })).toThrow(
      'JWT_SECRET must be at least 32 characters',
    );
  });

  it('rejects non-postgres DATABASE_URL', () => {
    expect(() =>
      parseEnv({ ...base, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow('postgresql:// or postgres://');
  });

  it('rejects invalid port', () => {
    expect(() => parseEnv({ ...base, API_PORT: '0' })).toThrow(
      'Invalid API port',
    );
  });
});
