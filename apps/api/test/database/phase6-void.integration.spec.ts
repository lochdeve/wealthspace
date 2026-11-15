import { randomUUID } from 'node:crypto';
import { resetSchema, seedMinimalSharedSpace, withClient } from './helpers';

describe('Phase 6 integrity — void and MEMBER', () => {
  beforeAll(async () => {
    await resetSchema();
  });

  it('voided shared expense skips participant validation', async () => {
    await withClient(async (c) => {
      const { spaceId, userA } = await seedMinimalSharedSpace(c);
      const sharedId = randomUUID();
      const now = new Date().toISOString();
      await c.query('BEGIN');
      try {
        await c.query(
          `INSERT INTO shared_expenses
           (id, space_id, payment_source, total_amount, currency, occurred_at, split_mode,
            recorded_by_user_id, paid_by_user_id, voided_at, voided_by_user_id, updated_at)
           VALUES ($1, $2, 'MEMBER', 100, 'EUR', $3, 'EQUAL', $4, $4, $3, $4, $3)`,
          [sharedId, spaceId, now, userA],
        );
        await c.query('COMMIT');
        const rows = await c.query<{ voided_at: string | null }>(
          `SELECT voided_at FROM shared_expenses WHERE id = $1`,
          [sharedId],
        );
        expect(rows.rows[0]?.voided_at).not.toBeNull();
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    });
  });
});
