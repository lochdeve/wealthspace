import { Client } from 'pg';

const DEFAULT_INTEGRATION_URL =
  'postgresql://wealthspace:wealthspace_dev@127.0.0.1:5432/wealthspace_migration_test';

/**
 * Ensures the integration database exists before `test:db` runs (mirrors CI `CREATE DATABASE`).
 * Connects to the `postgres` maintenance DB on the same host with the same credentials.
 */
export default async function globalSetup(): Promise<void> {
  const connectionString =
    process.env['INTEGRATION_DATABASE_URL'] ?? DEFAULT_INTEGRATION_URL;

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return;
  }

  const database = url.pathname.replace(/^\//, '').split('/')[0] ?? '';
  if (database === '') {
    return;
  }

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (rowCount === 0) {
      const escaped = database.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${escaped}"`);
    }
  } finally {
    await client.end();
  }
}
