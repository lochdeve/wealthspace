-- B-6.0 (fase 6): P-03 MEMBER, P-13 void (opción B), P-15 participantes. Aprobada por coordinación 2026-11-15.
-- After apply: sync manual integrity in prisma/sql/custom-integrity.sql (source of truth).

-- PaymentSource: MEMBER replaces CASH / EXTERNAL_PERSONAL
ALTER TABLE "shared_expenses" DROP CONSTRAINT IF EXISTS "shared_expenses_payment_source_check";

CREATE TYPE "PaymentSource_new" AS ENUM ('SPACE_ACCOUNT', 'MEMBER');

ALTER TABLE "shared_expenses"
  ALTER COLUMN "payment_source" DROP DEFAULT;

ALTER TABLE "shared_expenses"
  ALTER COLUMN "payment_source" TYPE "PaymentSource_new"
  USING (
    CASE "payment_source"::text
      WHEN 'SPACE_ACCOUNT' THEN 'SPACE_ACCOUNT'::"PaymentSource_new"
      ELSE 'MEMBER'::"PaymentSource_new"
    END
  );

DROP TYPE "PaymentSource";
ALTER TYPE "PaymentSource_new" RENAME TO "PaymentSource";

-- Logical void (shared expenses + financial transactions)
ALTER TABLE "financial_transactions"
  ADD COLUMN "voided_at" TIMESTAMPTZ(6),
  ADD COLUMN "voided_by_user_id" UUID;

ALTER TABLE "shared_expenses"
  ADD COLUMN "voided_at" TIMESTAMPTZ(6),
  ADD COLUMN "voided_by_user_id" UUID;

ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_voided_by_user_id_fkey"
  FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shared_expenses"
  ADD CONSTRAINT "shared_expenses_voided_by_user_id_fkey"
  FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_payment_source_check"
  CHECK (
    ("payment_source" = 'MEMBER'
      AND "paid_by_user_id" IS NOT NULL AND "financial_transaction_id" IS NULL)
    OR ("payment_source" = 'SPACE_ACCOUNT'
      AND "paid_by_user_id" IS NULL AND "financial_transaction_id" IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION wealthspace_validate_space_account_pairing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM financial_transactions ft
    WHERE ft.type = 'EXPENSE'::"TransactionType"
      AND ft.attributed_to_user_id IS NULL
      AND ft.voided_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM shared_expenses se
        WHERE se.financial_transaction_id = ft.id
          AND se.payment_source = 'SPACE_ACCOUNT'::"PaymentSource"
      )
  ) THEN
    RAISE EXCEPTION 'EXPENSE without attribution must be linked to SPACE_ACCOUNT shared expense';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM shared_expenses se
    WHERE se.payment_source = 'SPACE_ACCOUNT'::"PaymentSource"
      AND (
        se.financial_transaction_id IS NULL
        OR se.paid_by_user_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'SPACE_ACCOUNT shared expense requires transaction and no paid_by_user_id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM shared_expenses se
    INNER JOIN financial_transactions ft ON ft.id = se.financial_transaction_id
    WHERE se.payment_source = 'SPACE_ACCOUNT'::"PaymentSource"
      AND se.voided_at IS NULL
      AND ft.voided_at IS NULL
      AND (
        ft.type <> 'EXPENSE'::"TransactionType"
        OR ft.attributed_to_user_id IS NOT NULL
        OR ft.account_id IS NULL
        OR ft.space_id <> se.space_id
        OR ft.currency <> se.currency
        OR ft.amount <> se.total_amount
      )
  ) THEN
    RAISE EXCEPTION 'SPACE_ACCOUNT transaction pairing is invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM shared_expenses se
    INNER JOIN financial_transactions ft ON ft.id = se.financial_transaction_id
    WHERE ft.attributed_to_user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Payment transaction cannot have attributed_to_user_id';
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION wealthspace_validate_one_shared_participants(p_shared_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  total_amount numeric(19,4);
  cnt integer;
  sum_alloc numeric(19,4);
  payment_src "PaymentSource";
  paid_by uuid;
  voided timestamptz;
BEGIN
  SELECT
    se.total_amount,
    se.payment_source,
    se.paid_by_user_id,
    se.voided_at
  INTO total_amount, payment_src, paid_by, voided
  FROM shared_expenses se
  WHERE se.id = p_shared_expense_id;

  IF NOT FOUND OR voided IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer, COALESCE(SUM(allocated_amount), 0)
  INTO cnt, sum_alloc
  FROM expense_participants
  WHERE shared_expense_id = p_shared_expense_id;

  IF sum_alloc <> total_amount THEN
    RAISE EXCEPTION 'SharedExpense % participant sum % <> total %', p_shared_expense_id, sum_alloc, total_amount;
  END IF;

  IF payment_src = 'SPACE_ACCOUNT'::"PaymentSource" THEN
    IF cnt < 1 THEN
      RAISE EXCEPTION 'SharedExpense % must have at least one participant (has %)', p_shared_expense_id, cnt;
    END IF;
    RETURN;
  END IF;

  IF cnt < 1 THEN
    RAISE EXCEPTION 'SharedExpense % must have at least one participant (has %)', p_shared_expense_id, cnt;
  END IF;

  IF paid_by IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM expense_participants ep
    WHERE ep.shared_expense_id = p_shared_expense_id
      AND ep.user_id <> paid_by
  ) THEN
    RAISE EXCEPTION 'SharedExpense % must have a participant distinct from payer', p_shared_expense_id;
  END IF;
END;
$$;