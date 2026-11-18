import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Disposable DB for integration tests (`pnpm test:db`). Override with `INTEGRATION_DATABASE_URL`.
 * `pg` 8 + SCRAM requires a non-empty password; include one in the URL. Matches docker-compose
 * defaults (user/password) against a DB named `wealthspace_migration_test` you create locally.
 */
export const TEST_DB =
  process.env['INTEGRATION_DATABASE_URL'] ??
  'postgresql://wealthspace:wealthspace_dev@127.0.0.1:5432/wealthspace_migration_test';

/** Jest runs with cwd `apps/api`; paths must not rely on `import.meta` (CommonJS typecheck). */
const MIGRATIONS_DIR = join(process.cwd(), 'prisma/migrations');

export const MIGRATION_SQL = readFileSync(
  join(MIGRATIONS_DIR, '20260328183000_init/migration.sql'),
  'utf8',
);

const PHASE6_MIGRATION_PATH = join(
  MIGRATIONS_DIR,
  '20261115183000_phase6_shared_expenses/migration.sql',
);

export const PHASE6_MIGRATION_SQL = existsSync(PHASE6_MIGRATION_PATH)
  ? readFileSync(PHASE6_MIGRATION_PATH, 'utf8')
  : '';

const PHASE7_MIGRATION_PATH = join(
  MIGRATIONS_DIR,
  '20261117160000_phase7_settlements_void/migration.sql',
);

export const PHASE7_MIGRATION_SQL = existsSync(PHASE7_MIGRATION_PATH)
  ? readFileSync(PHASE7_MIGRATION_PATH, 'utf8')
  : '';

const PHASE8_MIGRATION_PATH = join(
  MIGRATIONS_DIR,
  '20261201120000_phase8_cross_space_cash_links/migration.sql',
);

export const PHASE8_MIGRATION_SQL = existsSync(PHASE8_MIGRATION_PATH)
  ? readFileSync(PHASE8_MIGRATION_PATH, 'utf8')
  : '';

export function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Expected at least one row');
  }
  return row;
}

export async function withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: TEST_DB });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function resetSchema(): Promise<void> {
  await withClient(async (c) => {
    await c.query('DROP SCHEMA IF EXISTS public CASCADE');
    await c.query('CREATE SCHEMA public');
    await c.query(MIGRATION_SQL);
    if (PHASE6_MIGRATION_SQL.length > 0) {
      await c.query(PHASE6_MIGRATION_SQL);
    }
    if (PHASE7_MIGRATION_SQL.length > 0) {
      await c.query(PHASE7_MIGRATION_SQL);
    }
    if (PHASE8_MIGRATION_SQL.length > 0) {
      await c.query(PHASE8_MIGRATION_SQL);
    }
  });
}

export async function truncateFinancialData(c: Client): Promise<void> {
  await c.query(`
    TRUNCATE TABLE
      financial_revisions,
      cross_space_cash_links,
      expense_participants,
      shared_expenses,
      settlements,
      financial_transactions,
      budgets,
      categories,
      accounts,
      space_invitations,
      space_memberships,
      users,
      spaces
    RESTART IDENTITY CASCADE
  `);
}

export type SeedContext = {
  spaceId: string;
  userA: string;
  userB: string;
  userC: string;
  accountId: string;
  now: string;
};

export async function seedMinimalSharedSpace(c: Client): Promise<SeedContext> {
  const spaceId = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const userC = randomUUID();
  const personalA = randomUUID();
  const personalB = randomUUID();
  const personalC = randomUUID();
  const accountId = randomUUID();
  const now = new Date().toISOString();

  await c.query(
    `INSERT INTO spaces (id, type, name, updated_at) VALUES ($1, 'SHARED', 'Test', $2)`,
    [spaceId, now],
  );
  for (const [id, name] of [
    [personalA, 'PA'],
    [personalB, 'PB'],
    [personalC, 'PC'],
  ] as const) {
    await c.query(
      `INSERT INTO spaces (id, type, name, updated_at) VALUES ($1, 'PERSONAL', $2, $3)`,
      [id, name, now],
    );
  }
  await c.query(
    `INSERT INTO users (id, email, display_name, personal_space_id, updated_at) VALUES
     ($1, $2, 'A', $3, $6), ($4, $5, 'B', $7, $6), ($8, $9, 'C', $10, $6)`,
    [
      userA,
      `a-${userA}@test.local`,
      personalA,
      userB,
      `b-${userB}@test.local`,
      now,
      personalB,
      userC,
      `c-${userC}@test.local`,
      personalC,
    ],
  );
  await c.query(
    `INSERT INTO space_memberships (id, space_id, user_id, role, status, updated_at)
     VALUES ($1, $2, $3, 'MEMBER', 'ACTIVE', $4), ($5, $2, $6, 'MEMBER', 'ACTIVE', $4), ($7, $2, $8, 'MEMBER', 'ACTIVE', $4)`,
    [
      randomUUID(),
      spaceId,
      userA,
      now,
      randomUUID(),
      userB,
      randomUUID(),
      userC,
    ],
  );
  await c.query(
    `INSERT INTO accounts (id, space_id, name, currency, updated_at) VALUES ($1, $2, 'Main', 'EUR', $3)`,
    [accountId, spaceId, now],
  );
  return { spaceId, userA, userB, userC, accountId, now };
}

export async function insertCashShared(
  c: Client,
  ctx: SeedContext,
  total: number,
  allocations: [string, number][],
): Promise<string> {
  const sharedId = randomUUID();
  await c.query('BEGIN');
  try {
    await c.query(
      `INSERT INTO shared_expenses
       (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, paid_by_user_id, updated_at)
       VALUES ($1, $2, 'MEMBER', $3, 'EUR', $4, 'EQUAL', $5, $5, $4)`,
      [sharedId, ctx.spaceId, total, ctx.now, ctx.userA],
    );
    for (const [userId, amount] of allocations) {
      await c.query(
        `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
         VALUES ($1, $2, $3, 'x', $4)`,
        [randomUUID(), sharedId, userId, amount],
      );
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  }
  return sharedId;
}

export async function insertSpaceAccountBatch(
  c: Client,
  ctx: SeedContext,
  amount: number,
): Promise<{ txId: string; sharedId: string }> {
  const txId = randomUUID();
  const sharedId = randomUUID();
  await c.query('BEGIN');
  try {
    await c.query(
      `INSERT INTO financial_transactions
       (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
       VALUES ($1, $2, 'EXPENSE', $3, 'EUR', $4, $5, $6, $4)`,
      [txId, ctx.spaceId, amount, ctx.now, ctx.userA, ctx.accountId],
    );
    await c.query(
      `INSERT INTO shared_expenses
       (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
       VALUES ($1, $2, 'SPACE_ACCOUNT', $3, 'EUR', $4, 'EQUAL', $5, $6, $4)`,
      [sharedId, ctx.spaceId, amount, ctx.now, ctx.userA, txId],
    );
    const half = amount / 2;
    await c.query(
      `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
       VALUES ($1, $2, $3, 'A', $4), ($5, $2, $6, 'B', $4)`,
      [randomUUID(), sharedId, ctx.userA, half, randomUUID(), ctx.userB],
    );
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  }
  return { txId, sharedId };
}
