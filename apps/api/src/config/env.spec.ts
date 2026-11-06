import { parseEnv } from './env';

describe('parseEnv', () => {
  const base: NodeJS.ProcessEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/wealthspace',
    API_PORT: '3001',
  };

  it('returns validated config', () => {
    expect(parseEnv(base)).toEqual({
      databaseUrl: base['DATABASE_URL'],
      port: 3001,
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
    expect(() => parseEnv({ API_PORT: '3001' })).toThrow(
      'DATABASE_URL is required',
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
