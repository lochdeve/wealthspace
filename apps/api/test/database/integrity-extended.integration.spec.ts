import { randomUUID } from 'node:crypto';
import {
  firstRow,
  insertCashShared,
  insertSpaceAccountBatch,
  resetSchema,
  seedMinimalSharedSpace,
  truncateFinancialData,
  withClient,
} from './helpers.js';

describe('PostgreSQL integrity — extended', () => {
  beforeAll(async () => {
    await resetSchema();
  });

  beforeEach(async () => {
    await withClient(truncateFinancialData);
  });

  describe('SPACE_ACCOUNT at COMMIT', () => {
    it('rejects amount mismatch between shared and transaction', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const txId = randomUUID();
        const sharedId = randomUUID();
        await c.query('BEGIN');
        try {
          await c.query(
            `INSERT INTO financial_transactions
             (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
             VALUES ($1, $2, 'EXPENSE', 100, 'EUR', $3, $4, $5, $3)`,
            [txId, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
          );
          await c.query(
            `INSERT INTO shared_expenses
             (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
             VALUES ($1, $2, 'SPACE_ACCOUNT', 90, 'EUR', $3, 'EQUAL', $4, $5, $3)`,
            [sharedId, ctx.spaceId, ctx.now, ctx.userA, txId],
          );
          await c.query(
            `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
             VALUES ($1, $2, $3, 'A', 45), ($4, $2, $5, 'B', 45)`,
            [randomUUID(), sharedId, ctx.userA, randomUUID(), ctx.userB],
          );
          await expect(c.query('COMMIT')).rejects.toThrow(
            /pairing|participant sum/i,
          );
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects currency mismatch', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const txId = randomUUID();
        const sharedId = randomUUID();
        await c.query('BEGIN');
        try {
          await c.query(
            `INSERT INTO financial_transactions
             (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
             VALUES ($1, $2, 'EXPENSE', 100, 'EUR', $3, $4, $5, $3)`,
            [txId, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
          );
          await c.query(
            `INSERT INTO shared_expenses
             (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
             VALUES ($1, $2, 'SPACE_ACCOUNT', 100, 'USD', $3, 'EQUAL', $4, $5, $3)`,
            [sharedId, ctx.spaceId, ctx.now, ctx.userA, txId],
          );
          await c.query(
            `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
             VALUES ($1, $2, $3, 'A', 50), ($4, $2, $5, 'B', 50)`,
            [randomUUID(), sharedId, ctx.userA, randomUUID(), ctx.userB],
          );
          await expect(c.query('COMMIT')).rejects.toThrow();
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects cross-space via composite FK on shared insert', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const otherSpace = randomUUID();
        const txId = randomUUID();
        const sharedId = randomUUID();
        await c.query(
          `INSERT INTO spaces (id, type, name, updated_at) VALUES ($1, 'SHARED', 'O', $2)`,
          [otherSpace, ctx.now],
        );
        await c.query('BEGIN');
        try {
          await c.query(
            `INSERT INTO financial_transactions
             (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
             VALUES ($1, $2, 'EXPENSE', 50, 'EUR', $3, $4, $5, $3)`,
            [txId, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
          );
          await expect(
            c.query(
              `INSERT INTO shared_expenses
               (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
               VALUES ($1, $2, 'SPACE_ACCOUNT', 50, 'EUR', $3, 'EQUAL', $4, $5, $3)`,
              [sharedId, otherSpace, ctx.now, ctx.userA, txId],
            ),
          ).rejects.toThrow();
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects shared-first insert (CHECK requires financial_transaction_id)', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        await expect(
          c.query(
            `INSERT INTO shared_expenses
             (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
             VALUES ($1, $2, 'SPACE_ACCOUNT', 50, 'EUR', $3, 'EQUAL', $4, $5, $3)`,
            [randomUUID(), ctx.spaceId, ctx.now, ctx.userA, randomUUID()],
          ),
        ).rejects.toThrow();
      });
    });

    it('rejects linking one transaction to two shared expenses', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const { txId } = await insertSpaceAccountBatch(c, ctx, 100);
        await c.query('BEGIN');
        try {
          await expect(
            c.query(
              `INSERT INTO shared_expenses
               (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
               VALUES ($1, $2, 'SPACE_ACCOUNT', 100, 'EUR', $3, 'EQUAL', $4, $5, $3)`,
              [randomUUID(), ctx.spaceId, ctx.now, ctx.userA, txId],
            ),
          ).rejects.toThrow();
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects deleting financial transaction still referenced by SPACE_ACCOUNT shared expense', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const { txId } = await insertSpaceAccountBatch(c, ctx, 100);
        await expect(
          c.query(`DELETE FROM financial_transactions WHERE id = $1`, [txId]),
        ).rejects.toThrow(/foreign key|violates/i);
      });
    });

    it('rejects changing financial_transaction_id to a mismatched transaction at commit', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const { sharedId } = await insertSpaceAccountBatch(c, ctx, 100);
        const otherTx = randomUUID();
        await c.query('BEGIN');
        try {
          await c.query(
            `INSERT INTO financial_transactions
             (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
             VALUES ($1, $2, 'EXPENSE', 50, 'EUR', $3, $4, $5, $3)`,
            [otherTx, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
          );
          await c.query(
            `UPDATE shared_expenses SET financial_transaction_id = $1 WHERE id = $2`,
            [otherTx, sharedId],
          );
          await expect(c.query('COMMIT')).rejects.toThrow(
            /pairing|participant sum|attribution/i,
          );
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('accepts transaction-first batch insert at commit', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        await insertSpaceAccountBatch(c, ctx, 80);
      });
    });

    it('rejects orphan transaction after removing shared in same transaction', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const txId = randomUUID();
        const sharedId = randomUUID();
        await c.query('BEGIN');
        try {
          await c.query(
            `INSERT INTO financial_transactions
             (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
             VALUES ($1, $2, 'EXPENSE', 100, 'EUR', $3, $4, $5, $3)`,
            [txId, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
          );
          await c.query(
            `INSERT INTO shared_expenses
             (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode, recorded_by_user_id, financial_transaction_id, updated_at)
             VALUES ($1, $2, 'SPACE_ACCOUNT', 100, 'EUR', $3, 'EQUAL', $4, $5, $3)`,
            [sharedId, ctx.spaceId, ctx.now, ctx.userA, txId],
          );
          await c.query(
            `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
             VALUES ($1, $2, $3, 'A', 50), ($4, $2, $5, 'B', 50)`,
            [randomUUID(), sharedId, ctx.userA, randomUUID(), ctx.userB],
          );
          await c.query(
            `DELETE FROM expense_participants WHERE shared_expense_id = $1`,
            [sharedId],
          );
          await c.query(`DELETE FROM shared_expenses WHERE id = $1`, [
            sharedId,
          ]);
          await expect(c.query('COMMIT')).rejects.toThrow(
            /pairing|SPACE_ACCOUNT|attribution/i,
          );
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects clearing financial_transaction_id on SPACE_ACCOUNT shared expense', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const { sharedId } = await insertSpaceAccountBatch(c, ctx, 100);
        await expect(
          c.query(
            `UPDATE shared_expenses SET financial_transaction_id = NULL WHERE id = $1`,
            [sharedId],
          ),
        ).rejects.toThrow(/check constraint|payment_source/i);
      });
    });
  });

  describe('Settlement historical membership', () => {
    it('rejects user who never belonged to the space', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const stranger = randomUUID();
        const personal = randomUUID();
        await c.query(
          `INSERT INTO spaces (id, type, name, updated_at) VALUES ($1, 'PERSONAL', 'S', $2)`,
          [personal, ctx.now],
        );
        await c.query(
          `INSERT INTO users (id, email, display_name, personal_space_id, updated_at) VALUES ($1, $2, 'S', $3, $4)`,
          [stranger, `s-${stranger}@test.local`, personal, ctx.now],
        );
        await expect(
          c.query(
            `INSERT INTO settlements
             (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
             VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
            [
              randomUUID(),
              ctx.spaceId,
              stranger,
              ctx.userB,
              new Date('2024-06-01T00:00:00.000Z'),
              ctx.now,
            ],
          ),
        ).rejects.toThrow(/member at occurred_at/i);
      });
    });

    it('rejects occurred_at before joined_at', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const joined = new Date('2024-06-01T00:00:00.000Z');
        await c.query(
          `UPDATE space_memberships SET joined_at = $1 WHERE space_id = $2 AND user_id = $3`,
          [joined, ctx.spaceId, ctx.userA],
        );
        await expect(
          c.query(
            `INSERT INTO settlements
             (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
             VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
            [
              randomUUID(),
              ctx.spaceId,
              ctx.userA,
              ctx.userB,
              new Date('2024-01-01T00:00:00.000Z'),
              ctx.now,
            ],
          ),
        ).rejects.toThrow();
      });
    });

    it('rejects occurred_at after left_at', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const left = new Date('2024-06-01T00:00:00.000Z');
        await c.query(
          `UPDATE space_memberships SET joined_at = $1, left_at = $2, status = 'LEFT' WHERE space_id = $3 AND user_id = $4`,
          [new Date('2024-01-01T00:00:00.000Z'), left, ctx.spaceId, ctx.userA],
        );
        await expect(
          c.query(
            `INSERT INTO settlements
             (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
             VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
            [
              randomUUID(),
              ctx.spaceId,
              ctx.userA,
              ctx.userB,
              new Date('2024-07-01T00:00:00.000Z'),
              ctx.now,
            ],
          ),
        ).rejects.toThrow();
      });
    });

    it('accepts retroactive settlement when both were members at occurred_at', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const occurred = new Date('2024-06-15T00:00:00.000Z');
        await c.query(
          `UPDATE space_memberships SET joined_at = $1, left_at = $2, status = 'LEFT'
           WHERE space_id = $3 AND user_id IN ($4, $5)`,
          [
            new Date('2024-01-01T00:00:00.000Z'),
            new Date('2025-01-01T00:00:00.000Z'),
            ctx.spaceId,
            ctx.userA,
            ctx.userB,
          ],
        );
        await c.query(
          `INSERT INTO settlements
           (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
           VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
          [randomUUID(), ctx.spaceId, ctx.userA, ctx.userB, occurred, ctx.now],
        );
      });
    });

    it('rejects occurred_at equal to left_at (half-open interval)', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const left = new Date('2024-06-01T00:00:00.000Z');
        await c.query(
          `UPDATE space_memberships SET joined_at = $1, left_at = $2, status = 'LEFT'
           WHERE space_id = $3 AND user_id = $4`,
          [new Date('2024-01-01T00:00:00.000Z'), left, ctx.spaceId, ctx.userA],
        );
        await expect(
          c.query(
            `INSERT INTO settlements
             (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
             VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
            [randomUUID(), ctx.spaceId, ctx.userA, ctx.userB, left, ctx.now],
          ),
        ).rejects.toThrow(/member at occurred_at/i);
      });
    });

    it('does not invalidate settlement when member leaves after occurred_at', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const occurred = new Date('2024-06-15T00:00:00.000Z');
        await c.query(
          `UPDATE space_memberships SET joined_at = $1 WHERE space_id = $2 AND user_id IN ($3, $4)`,
          [
            new Date('2024-01-01T00:00:00.000Z'),
            ctx.spaceId,
            ctx.userA,
            ctx.userB,
          ],
        );
        await c.query(
          `INSERT INTO settlements
           (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
           VALUES ($1, $2, $3, $4, 10, 'EUR', $5, $3, $6)`,
          [randomUUID(), ctx.spaceId, ctx.userA, ctx.userB, occurred, ctx.now],
        );
        await c.query(
          `UPDATE space_memberships SET left_at = $1, status = 'LEFT' WHERE space_id = $2 AND user_id = $3`,
          [new Date('2024-07-01T00:00:00.000Z'), ctx.spaceId, ctx.userA],
        );
        const { n } = firstRow(
          (
            await c.query<{ n: number }>(
              `SELECT COUNT(*)::int AS n FROM settlements WHERE space_id = $1`,
              [ctx.spaceId],
            )
          ).rows,
        );
        expect(n).toBe(1);
      });
    });

    it('rejects from_user_id = to_user_id', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        await expect(
          c.query(
            `INSERT INTO settlements
             (id, space_id, from_user_id, to_user_id, amount, currency, occurred_at, recorded_by_user_id, updated_at)
             VALUES ($1, $2, $3, $3, 10, 'EUR', $4, $3, $5)`,
            [randomUUID(), ctx.spaceId, ctx.userA, ctx.now, ctx.now],
          ),
        ).rejects.toThrow();
      });
    });
  });

  describe('Participants at COMMIT', () => {
    it('allows moving participant between two valid shared expenses', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const s1 = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userB, 50],
        ]);
        const s2 = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userC, 50],
        ]);
        const partC = firstRow(
          (
            await c.query<{ id: string }>(
              `SELECT id FROM expense_participants WHERE shared_expense_id = $1 AND user_id = $2`,
              [s2, ctx.userC],
            )
          ).rows,
        ).id;
        const partB = firstRow(
          (
            await c.query<{ id: string }>(
              `SELECT id FROM expense_participants WHERE shared_expense_id = $1 AND user_id = $2`,
              [s1, ctx.userB],
            )
          ).rows,
        ).id;
        await c.query('BEGIN');
        try {
          await c.query(`DELETE FROM expense_participants WHERE id = $1`, [
            partB,
          ]);
          await c.query(
            `UPDATE expense_participants SET shared_expense_id = $1 WHERE id = $2`,
            [s1, partC],
          );
          await c.query(
            `INSERT INTO expense_participants (id, shared_expense_id, user_id, display_name_snapshot, allocated_amount)
             VALUES ($1, $2, $3, 'B', 50)`,
            [randomUUID(), s2, ctx.userB],
          );
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
      });
    });

    it('rejects move that leaves source without participant distinct from payer (P-15)', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const s1 = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userB, 50],
        ]);
        const s2 = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userC, 50],
        ]);
        const partB = firstRow(
          (
            await c.query<{ id: string }>(
              `SELECT id FROM expense_participants WHERE shared_expense_id = $1 AND user_id = $2`,
              [s1, ctx.userB],
            )
          ).rows,
        ).id;
        await c.query('BEGIN');
        try {
          await c.query(
            `UPDATE expense_participants SET shared_expense_id = $1 WHERE id = $2`,
            [s2, partB],
          );
          await expect(c.query('COMMIT')).rejects.toThrow(
            /distinct from payer|participant sum/i,
          );
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects UPDATE total_amount without adjusting allocations', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const sharedId = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userB, 50],
        ]);
        await c.query('BEGIN');
        try {
          await c.query(
            `UPDATE shared_expenses SET total_amount = 120 WHERE id = $1`,
            [sharedId],
          );
          await expect(c.query('COMMIT')).rejects.toThrow(/participant sum/i);
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects move that breaks destination participant sum', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const s1 = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userB, 50],
        ]);
        const s2 = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userC, 50],
        ]);
        const partC = firstRow(
          (
            await c.query<{ id: string }>(
              `SELECT id FROM expense_participants WHERE shared_expense_id = $1 AND user_id = $2`,
              [s2, ctx.userC],
            )
          ).rows,
        ).id;
        await c.query('BEGIN');
        try {
          await c.query(
            `UPDATE expense_participants SET shared_expense_id = $1, allocated_amount = 60 WHERE id = $2`,
            [s1, partC],
          );
          await expect(c.query('COMMIT')).rejects.toThrow(
            /participant sum|at least two participants/i,
          );
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects deleting parent shared expense while participants still exist', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const sharedId = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userB, 50],
        ]);
        await c.query('BEGIN');
        try {
          await expect(
            c.query(`DELETE FROM shared_expenses WHERE id = $1`, [sharedId]),
          ).rejects.toThrow();
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });

    it('rejects deleting participant leaving only payer (P-15)', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const sharedId = await insertCashShared(c, ctx, 100, [
          [ctx.userA, 50],
          [ctx.userB, 50],
        ]);
        const partB = firstRow(
          (
            await c.query<{ id: string }>(
              `SELECT id FROM expense_participants WHERE shared_expense_id = $1 AND user_id = $2`,
              [sharedId, ctx.userB],
            )
          ).rows,
        ).id;
        await c.query('BEGIN');
        try {
          await c.query(`DELETE FROM expense_participants WHERE id = $1`, [
            partB,
          ]);
          await expect(c.query('COMMIT')).rejects.toThrow();
        } finally {
          await c.query('ROLLBACK');
        }
      });
    });
  });

  describe('Optimistic revision flow (SQL only, not API)', () => {
    it('atomic: update version + insert revision in one transaction', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const txId = randomUUID();
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, attributed_to_user_id, version, updated_at)
           VALUES ($1, $2, 'EXPENSE', 10, 'EUR', $3, $4, $5, $4, 1, $3)`,
          [txId, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
        );
        await c.query('BEGIN');
        try {
          const before = firstRow(
            (
              await c.query<{ amount: string; version: number }>(
                `SELECT amount, version FROM financial_transactions WHERE id = $1`,
                [txId],
              )
            ).rows,
          );
          const upd = await c.query(
            `UPDATE financial_transactions SET amount = 11, version = version + 1
             WHERE id = $1 AND version = 1 RETURNING version`,
            [txId],
          );
          expect(upd.rowCount).toBe(1);
          await c.query(
            `INSERT INTO financial_revisions
             (id, revision_number, snapshot, changed_by_user_id, financial_transaction_id)
             VALUES ($1, 1, $2::jsonb, $3, $4)`,
            [
              randomUUID(),
              JSON.stringify({
                schemaVersion: 1,
                entity: 'FinancialTransaction',
                data: before,
              }),
              ctx.userA,
              txId,
            ],
          );
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        }
        const after = firstRow(
          (
            await c.query<{ version: number }>(
              `SELECT version FROM financial_transactions WHERE id = $1`,
              [txId],
            )
          ).rows,
        );
        expect(after.version).toBe(2);
      });
    });

    it('rejects duplicate revision_number for same entity', async () => {
      await withClient(async (c) => {
        const ctx = await seedMinimalSharedSpace(c);
        const txId = randomUUID();
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, attributed_to_user_id, updated_at)
           VALUES ($1, $2, 'EXPENSE', 10, 'EUR', $3, $4, $5, $4, $3)`,
          [txId, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
        );
        await c.query(
          `INSERT INTO financial_revisions
           (id, revision_number, snapshot, changed_by_user_id, financial_transaction_id)
           VALUES ($1, 1, '{}'::jsonb, $2, $3)`,
          [randomUUID(), ctx.userA, txId],
        );
        await expect(
          c.query(
            `INSERT INTO financial_revisions
             (id, revision_number, snapshot, changed_by_user_id, financial_transaction_id)
             VALUES ($1, 1, '{}'::jsonb, $2, $3)`,
            [randomUUID(), ctx.userA, txId],
          ),
        ).rejects.toThrow();
      });
    });
  });
});
