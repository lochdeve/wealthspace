import { randomUUID } from 'node:crypto';
import {
  firstRow,
  resetSchema,
  seedMinimalSharedSpace,
  truncateFinancialData,
  withClient,
} from './helpers.js';

describe('PostgreSQL integrity (disposable DB)', () => {
  beforeAll(async () => {
    await resetSchema();
  });

  beforeEach(async () => {
    await withClient(truncateFinancialData);
  });

  it('accepts negative OPENING_BALANCE', async () => {
    await withClient(async (c) => {
      const { userA } = await seedMinimalSharedSpace(c);
      const personal = firstRow(
        (
          await c.query<{ personal_space_id: string }>(
            `SELECT personal_space_id FROM users WHERE id = $1`,
            [userA],
          )
        ).rows,
      ).personal_space_id;
      const personalAccountId = randomUUID();
      const txId = randomUUID();
      const now = new Date().toISOString();
      await c.query(
        `INSERT INTO accounts (id, space_id, name, currency, updated_at) VALUES ($1, $2, 'Personal', 'EUR', $3)`,
        [personalAccountId, personal, now],
      );
      await c.query(
        `INSERT INTO financial_transactions
         (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
         VALUES ($1, $2, 'OPENING_BALANCE', -100, 'EUR', $3, $4, $5, $3)`,
        [txId, personal, now, userA, personalAccountId],
      );
    });
  });

  it('rejects invalid TransactionType field combination (INCOME with transfer fields)', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, accountId } = await seedMinimalSharedSpace(c);
      const now = new Date().toISOString();
      await expect(
        c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, source_account_id, updated_at)
           VALUES ($1, $2, 'INCOME', 10, 'EUR', $3, $4, $5, $5, $3)`,
          [randomUUID(), spaceId, now, userA, accountId],
        ),
      ).rejects.toThrow();
    });
  });

  it('rejects composite FK cross-space account reference', async () => {
    await withClient(async (c) => {
      const { userA, accountId } = await seedMinimalSharedSpace(c);
      const otherSpace = randomUUID();
      const now = new Date().toISOString();
      await c.query(
        `INSERT INTO spaces (id, type, name, updated_at) VALUES ($1, 'SHARED', 'Other', $2)`,
        [otherSpace, now],
      );
      await expect(
        c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, attributed_to_user_id, updated_at)
           VALUES ($1, $2, 'EXPENSE', 10, 'EUR', $3, $4, $5, $4, $3)`,
          [randomUUID(), otherSpace, now, userA, accountId],
        ),
      ).rejects.toThrow();
    });
  });

  it('accepts valid composite FK reference', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, accountId } = await seedMinimalSharedSpace(c);
      const now = new Date().toISOString();
      await c.query(
        `INSERT INTO financial_transactions
         (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, attributed_to_user_id, updated_at)
         VALUES ($1, $2, 'EXPENSE', 10, 'EUR', $3, $4, $5, $4, $3)`,
        [randomUUID(), spaceId, now, userA, accountId],
      );
    });
  });

  it('SPACE_ACCOUNT: valid batch commits without SET CONSTRAINTS', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, userB, accountId } =
        await seedMinimalSharedSpace(c);
      const txId = randomUUID();
      const sharedId = randomUUID();
      const now = new Date().toISOString();
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
           VALUES ($1, $2, 'EXPENSE', 100, 'EUR', $3, $4, $5, $3)`,
          [txId, spaceId, now, userA, accountId],
        );
        await c.query(
          `INSERT INTO shared_expenses
           (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
           VALUES ($1, $2, 'SPACE_ACCOUNT', 100, 'EUR', $3, 'EQUAL', $4, $5, $3)`,
          [sharedId, spaceId, now, userA, txId],
        );
        await c.query(
          `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
           VALUES ($1, $2, $3, 'A', 50), ($4, $2, $5, 'B', 50)`,
          [randomUUID(), sharedId, userA, randomUUID(), userB],
        );
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  });

  it('SPACE_ACCOUNT: incomplete pairing rejected at COMMIT', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, accountId } = await seedMinimalSharedSpace(c);
      const txId = randomUUID();
      const now = new Date().toISOString();
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
           VALUES ($1, $2, 'EXPENSE', 50, 'EUR', $3, $4, $5, $3)`,
          [txId, spaceId, now, userA, accountId],
        );
        await expect(c.query('COMMIT')).rejects.toThrow();
      } finally {
        await c.query('ROLLBACK');
      }
    });
  });

  it('participants: sum mismatch rejected at COMMIT', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, userB } = await seedMinimalSharedSpace(c);
      const sharedId = randomUUID();
      const now = new Date().toISOString();
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO shared_expenses
           (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, paid_by_user_id, updated_at)
           VALUES ($1, $2, 'MEMBER', 100, 'EUR', $3, 'EQUAL', $4, $4, $3)`,
          [sharedId, spaceId, now, userA],
        );
        await c.query(
          `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
           VALUES ($1, $2, $3, 'A', 40), ($4, $2, $5, 'B', 40)`,
          [randomUUID(), sharedId, userA, randomUUID(), userB],
        );
        await expect(c.query('COMMIT')).rejects.toThrow();
      } finally {
        await c.query('ROLLBACK');
      }
    });
  });

  it('participants: payer-only participant rejected at COMMIT (P-15)', async () => {
    await withClient(async (c) => {
      const { spaceId, userA } = await seedMinimalSharedSpace(c);
      const sharedId = randomUUID();
      const now = new Date().toISOString();
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO shared_expenses
           (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, paid_by_user_id, updated_at)
           VALUES ($1, $2, 'MEMBER', 100, 'EUR', $3, 'EQUAL', $4, $4, $3)`,
          [sharedId, spaceId, now, userA],
        );
        await c.query(
          `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
           VALUES ($1, $2, $3, 'A', 100)`,
          [randomUUID(), sharedId, userA],
        );
        await expect(c.query('COMMIT')).rejects.toThrow();
      } finally {
        await c.query('ROLLBACK');
      }
    });
  });

  it('participants: one participant distinct from payer commits (P-15)', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, userB } = await seedMinimalSharedSpace(c);
      const sharedId = randomUUID();
      const now = new Date().toISOString();
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO shared_expenses
           (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, paid_by_user_id, updated_at)
           VALUES ($1, $2, 'MEMBER', 60, 'EUR', $3, 'EQUAL', $4, $4, $3)`,
          [sharedId, spaceId, now, userA],
        );
        await c.query(
          `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
           VALUES ($1, $2, $3, 'B', 60)`,
          [randomUUID(), sharedId, userB],
        );
        await c.query('COMMIT');
        const { rowCount } = await c.query(
          `SELECT 1 FROM shared_expenses WHERE id = $1`,
          [sharedId],
        );
        expect(rowCount).toBe(1);
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  });

  it('settlement retroactive: valid when occurred_at within membership', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, userB } = await seedMinimalSharedSpace(c);
      const joined = new Date('2024-01-01T00:00:00.000Z');
      const occurred = new Date('2024-06-01T00:00:00.000Z');
      const left = new Date('2025-01-01T00:00:00.000Z');
      const now = new Date().toISOString();
      await c.query(
        `UPDATE space_memberships SET joined_at = $1, left_at = $2, status = 'LEFT'
         WHERE space_id = $3 AND user_id IN ($4, $5)`,
        [joined, left, spaceId, userA, userB],
      );
      await c.query(
        `INSERT INTO settlements
         (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
         VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
        [randomUUID(), spaceId, userA, userB, occurred, now],
      );
    });
  });

  it('settlement: allowed when occurred_at = left_at (P-19)', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, userB } = await seedMinimalSharedSpace(c);
      const joined = new Date('2024-01-01T00:00:00.000Z');
      const left = new Date('2024-06-01T00:00:00.000Z');
      await c.query(
        `UPDATE space_memberships SET joined_at = $1, left_at = $2, status = 'LEFT'
         WHERE space_id = $3 AND user_id IN ($4, $5)`,
        [joined, left, spaceId, userA, userB],
      );
      await c.query(
        `INSERT INTO settlements
           (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
           VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, NOW())`,
        [randomUUID(), spaceId, userA, userB, left],
      );
    });
  });

  it('financial_revisions immutable', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, accountId } = await seedMinimalSharedSpace(c);
      const revId = randomUUID();
      const txId = randomUUID();
      const now = new Date().toISOString();
      await c.query(
        `INSERT INTO financial_transactions
         (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, attributed_to_user_id, updated_at)
         VALUES ($1, $2, 'EXPENSE', 5, 'EUR', $3, $4, $5, $4, $3)`,
        [txId, spaceId, now, userA, accountId],
      );
      await c.query(
        `INSERT INTO financial_revisions
         (id, revision_number, snapshot, changed_by_user_id, financial_transaction_id)
         VALUES ($1, 1, '{}'::jsonb, $2, $3)`,
        [revId, userA, txId],
      );
      await expect(
        c.query(`UPDATE financial_revisions SET reason = 'x' WHERE id = $1`, [
          revId,
        ]),
      ).rejects.toThrow();
    });
  });

  it('optimistic concurrency: only one conditional version update succeeds', async () => {
    await withClient(async (c) => {
      const { spaceId, userA, accountId } = await seedMinimalSharedSpace(c);
      const txId = randomUUID();
      const now = new Date().toISOString();
      await c.query(
        `INSERT INTO financial_transactions
         (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, attributed_to_user_id, version, updated_at)
         VALUES ($1, $2, 'EXPENSE', 10, 'EUR', $3, $4, $5, $4, 1, $3)`,
        [txId, spaceId, now, userA, accountId],
      );

      const u1 = await c.query(
        `UPDATE financial_transactions SET amount = 11, version = version + 1
         WHERE id = $1 AND version = 1 RETURNING version`,
        [txId],
      );
      const u2 = await c.query(
        `UPDATE financial_transactions SET amount = 12, version = version + 1
         WHERE id = $1 AND version = 1 RETURNING version`,
        [txId],
      );
      expect(u1.rowCount).toBe(1);
      expect(u2.rowCount).toBe(0);
    });
  });
});
