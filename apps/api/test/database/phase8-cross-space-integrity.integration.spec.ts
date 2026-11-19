import { randomUUID } from 'node:crypto';
import { resetSchema, seedMinimalSharedSpace, withClient } from './helpers';

describe('Phase 8 — cross_space_cash_links integrity', () => {
  beforeAll(async () => {
    await resetSchema();
  });

  it('rejects anchor CHECK (contribution row cannot reference settlement)', async () => {
    await withClient(async (c) => {
      const ctx = await seedMinimalSharedSpace(c);
      await c.query('BEGIN');
      try {
        await expect(
          c.query(
            `INSERT INTO cross_space_cash_links
             (id, kind, owner_user_id, personal_transaction_id, shared_space_id, settlement_id)
             VALUES ($1, 'CONTRIBUTION_PAIR', $2, $3, $4, $5)`,
            [randomUUID(), ctx.userA, randomUUID(), ctx.spaceId, randomUUID()],
          ),
        ).rejects.toThrow();
        await c.query('ROLLBACK');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  });

  it('allows CONTRIBUTION_PAIR when personal EXPENSE matches SHARED INCOME contributor', async () => {
    await withClient(async (c) => {
      const ctx = await seedMinimalSharedSpace(c);
      const personalAccount = randomUUID();
      const personalTx = randomUUID();
      const sharedIncome = randomUUID();
      const groupId = randomUUID();
      const linkId = randomUUID();

      const personalSpace = (
        await c.query(`SELECT personal_space_id FROM users WHERE id = $1`, [
          ctx.userA,
        ])
      ).rows[0]?.personal_space_id as string;

      await c.query(
        `INSERT INTO accounts (id, space_id, name, currency, updated_at)
         VALUES ($1, $2, 'Personal', 'EUR', $3)`,
        [personalAccount, personalSpace, ctx.now],
      );

      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id, updated_at)
           VALUES ($1, $2, 'EXPENSE', 50, 'EUR', $3, $4, $5, $3)`,
          [personalTx, personalSpace, ctx.now, ctx.userA, personalAccount],
        );
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id,
            attributed_to_user_id, updated_at)
           VALUES ($1, $2, 'INCOME', 50, 'EUR', $3, $4, $5, $4, $3)`,
          [sharedIncome, ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
        );
        await c.query(
          `INSERT INTO cross_space_cash_links
           (id, kind, owner_user_id, personal_transaction_id, shared_space_id, contribution_group_id)
           VALUES ($1, 'CONTRIBUTION_PAIR', $2, $3, $4, $5)`,
          [linkId, ctx.userA, personalTx, ctx.spaceId, groupId],
        );
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }

      const rows = await c.query(
        `SELECT id FROM cross_space_cash_links WHERE contribution_group_id = $1`,
        [groupId],
      );
      expect(rows.rowCount).toBe(1);
    });
  });

  it('rejects SHARED INCOME with attributed_to without contribution link at COMMIT', async () => {
    await withClient(async (c) => {
      const ctx = await seedMinimalSharedSpace(c);
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO financial_transactions
           (id, space_id, type, amount, currency, occurred_at, recorded_by_user_id, account_id,
            attributed_to_user_id, updated_at)
           VALUES ($1, $2, 'INCOME', 25, 'EUR', $3, $4, $5, $4, $3)`,
          [randomUUID(), ctx.spaceId, ctx.now, ctx.userA, ctx.accountId],
        );
        await expect(c.query('COMMIT')).rejects.toThrow(
          /contributor requires|CONTRIBUTION_PAIR/i,
        );
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  });
});
