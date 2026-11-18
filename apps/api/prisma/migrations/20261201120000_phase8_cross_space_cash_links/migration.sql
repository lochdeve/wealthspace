-- B-8.0 (fase 8): cross_space_cash_links + P-05 SHARED INCOME with contributor (attributed_to_user_id).
-- DRAFT — apply only after coordination review. Do NOT `migrate deploy` in dev until approved.
-- After apply: sync manual integrity in prisma/sql/custom-integrity.sql (source of truth).

CREATE TYPE "CrossSpaceCashLinkKind" AS ENUM (
  'SHARED_EXPENSE_MEMBER_PAYMENT',
  'SETTLEMENT_FROM_OUT',
  'SETTLEMENT_TO_IN',
  'CONTRIBUTION_PAIR'
);

CREATE TABLE "cross_space_cash_links" (
  "id" UUID NOT NULL,
  "kind" "CrossSpaceCashLinkKind" NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "personal_transaction_id" UUID NOT NULL,
  "shared_space_id" UUID NOT NULL,
  "shared_expense_id" UUID,
  "settlement_id" UUID,
  "contribution_group_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cross_space_cash_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cross_space_cash_links_personal_transaction_id_key"
  ON "cross_space_cash_links"("personal_transaction_id");

CREATE INDEX "cross_space_cash_links_shared_expense_id_idx"
  ON "cross_space_cash_links"("shared_expense_id");
CREATE INDEX "cross_space_cash_links_settlement_id_idx"
  ON "cross_space_cash_links"("settlement_id");
CREATE INDEX "cross_space_cash_links_owner_user_id_idx"
  ON "cross_space_cash_links"("owner_user_id");
CREATE INDEX "cross_space_cash_links_contribution_group_id_idx"
  ON "cross_space_cash_links"("contribution_group_id");
CREATE INDEX "cross_space_cash_links_shared_space_id_idx"
  ON "cross_space_cash_links"("shared_space_id");

ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_space_id_id_key" UNIQUE ("space_id", "id");

ALTER TABLE "cross_space_cash_links"
  ADD CONSTRAINT "cross_space_cash_links_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cross_space_cash_links"
  ADD CONSTRAINT "cross_space_cash_links_personal_transaction_id_fkey"
  FOREIGN KEY ("personal_transaction_id") REFERENCES "financial_transactions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cross_space_cash_links"
  ADD CONSTRAINT "cross_space_cash_links_shared_space_id_fkey"
  FOREIGN KEY ("shared_space_id") REFERENCES "spaces"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cross_space_cash_links"
  ADD CONSTRAINT "cross_space_cash_links_space_expense_fkey"
  FOREIGN KEY ("shared_space_id", "shared_expense_id")
  REFERENCES "shared_expenses" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cross_space_cash_links"
  ADD CONSTRAINT "cross_space_cash_links_space_settlement_fkey"
  FOREIGN KEY ("shared_space_id", "settlement_id")
  REFERENCES "settlements" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cross_space_cash_links" ADD CONSTRAINT "cross_space_cash_links_anchor_check"
  CHECK (
    (
      "kind" = 'CONTRIBUTION_PAIR'::"CrossSpaceCashLinkKind"
      AND "contribution_group_id" IS NOT NULL
      AND "shared_expense_id" IS NULL
      AND "settlement_id" IS NULL
    )
    OR (
      "kind" = 'SHARED_EXPENSE_MEMBER_PAYMENT'::"CrossSpaceCashLinkKind"
      AND "shared_expense_id" IS NOT NULL
      AND "settlement_id" IS NULL
      AND "contribution_group_id" IS NULL
    )
    OR (
      "kind" IN (
        'SETTLEMENT_FROM_OUT'::"CrossSpaceCashLinkKind",
        'SETTLEMENT_TO_IN'::"CrossSpaceCashLinkKind"
      )
      AND "settlement_id" IS NOT NULL
      AND "shared_expense_id" IS NULL
      AND "contribution_group_id" IS NULL
    )
  );

ALTER TABLE "financial_transactions" DROP CONSTRAINT IF EXISTS "financial_transactions_fields_by_type_check";

ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_fields_by_type_check"
  CHECK (
    (
      "type" = 'INCOME'
      AND "account_id" IS NOT NULL
      AND "source_account_id" IS NULL
      AND "destination_account_id" IS NULL
    )
    OR (
      "type" = 'EXPENSE'
      AND "source_account_id" IS NULL
      AND "destination_account_id" IS NULL
    )
    OR (
      "type" = 'TRANSFER'
      AND "account_id" IS NULL
      AND "source_account_id" IS NOT NULL
      AND "destination_account_id" IS NOT NULL
      AND "source_account_id" <> "destination_account_id"
      AND "attributed_to_user_id" IS NULL
      AND "category_id" IS NULL
    )
    OR (
      "type" = 'OPENING_BALANCE'
      AND "account_id" IS NOT NULL
      AND "source_account_id" IS NULL
      AND "destination_account_id" IS NULL
      AND "attributed_to_user_id" IS NULL
      AND "category_id" IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Phase 8: cross-space cash link integrity (defer to COMMIT where noted)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_validate_space_account_pairing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM financial_transactions ft
    INNER JOIN spaces s ON s.id = ft.space_id
    WHERE ft.type = 'EXPENSE'::"TransactionType"
      AND s.type = 'SHARED'::"SpaceType"
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

CREATE OR REPLACE FUNCTION wealthspace_trg_cross_space_link_before_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_personal_space uuid;
  v_tx_space uuid;
  v_space_type "SpaceType";
BEGIN
  SELECT u.personal_space_id INTO v_personal_space
  FROM users u
  WHERE u.id = NEW.owner_user_id;

  IF v_personal_space IS NULL THEN
    RAISE EXCEPTION 'owner_user_id must exist';
  END IF;

  SELECT ft.space_id INTO v_tx_space
  FROM financial_transactions ft
  WHERE ft.id = NEW.personal_transaction_id;

  IF v_tx_space IS DISTINCT FROM v_personal_space THEN
    RAISE EXCEPTION 'personal_transaction_id must belong to owner personal space';
  END IF;

  SELECT type INTO v_space_type FROM spaces WHERE id = NEW.shared_space_id;
  IF v_space_type IS DISTINCT FROM 'SHARED'::"SpaceType" THEN
    RAISE EXCEPTION 'shared_space_id must be SHARED';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cross_space_link_before_row
  BEFORE INSERT OR UPDATE ON cross_space_cash_links
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_cross_space_link_before_row();

CREATE OR REPLACE FUNCTION wealthspace_validate_cross_space_cash_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  v_space_type "SpaceType";
BEGIN
  IF EXISTS (
    SELECT 1
    FROM financial_transactions ft
    INNER JOIN spaces s ON s.id = ft.space_id
    WHERE ft.type = 'INCOME'::"TransactionType"
      AND ft.attributed_to_user_id IS NOT NULL
      AND ft.voided_at IS NULL
      AND s.type = 'PERSONAL'::"SpaceType"
  ) THEN
    RAISE EXCEPTION 'INCOME with attributed_to_user_id is not allowed in PERSONAL space';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM financial_transactions sh_inc
    INNER JOIN spaces s ON s.id = sh_inc.space_id
    WHERE s.type = 'SHARED'::"SpaceType"
      AND sh_inc.type = 'INCOME'::"TransactionType"
      AND sh_inc.attributed_to_user_id IS NOT NULL
      AND sh_inc.voided_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM cross_space_cash_links c
        INNER JOIN financial_transactions p ON p.id = c.personal_transaction_id
        WHERE c.kind = 'CONTRIBUTION_PAIR'::"CrossSpaceCashLinkKind"
          AND c.shared_space_id = sh_inc.space_id
          AND c.owner_user_id = sh_inc.attributed_to_user_id
          AND p.amount = sh_inc.amount
          AND p.currency = sh_inc.currency
      )
  ) THEN
    RAISE EXCEPTION 'SHARED INCOME with contributor requires CONTRIBUTION_PAIR link';
  END IF;

  FOR rec IN
    SELECT c.*, ft.type AS tx_type, ft.amount, ft.currency, ft.voided_at AS tx_voided
    FROM cross_space_cash_links c
    INNER JOIN financial_transactions ft ON ft.id = c.personal_transaction_id
  LOOP
  IF rec.kind = 'SHARED_EXPENSE_MEMBER_PAYMENT' THEN
    IF rec.tx_type <> 'EXPENSE'::"TransactionType" THEN
      RAISE EXCEPTION 'SHARED_EXPENSE_MEMBER_PAYMENT requires personal EXPENSE';
    END IF;
    IF rec.tx_voided IS NOT NULL THEN
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM shared_expenses se
      WHERE se.id = rec.shared_expense_id
        AND se.space_id = rec.shared_space_id
        AND se.voided_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM shared_expenses se
      WHERE se.id = rec.shared_expense_id
        AND se.space_id = rec.shared_space_id
        AND se.payment_source = 'MEMBER'::"PaymentSource"
        AND se.paid_by_user_id = rec.owner_user_id
        AND se.voided_at IS NULL
        AND se.total_amount = rec.amount
        AND se.currency = rec.currency
    ) THEN
      RAISE EXCEPTION 'shared expense member payment link does not match expense';
    END IF;
  ELSIF rec.kind IN (
    'SETTLEMENT_FROM_OUT'::"CrossSpaceCashLinkKind",
    'SETTLEMENT_TO_IN'::"CrossSpaceCashLinkKind"
  ) THEN
    IF rec.kind = 'SETTLEMENT_FROM_OUT' AND rec.tx_type <> 'EXPENSE'::"TransactionType" THEN
      RAISE EXCEPTION 'SETTLEMENT_FROM_OUT requires personal EXPENSE';
    END IF;
    IF rec.kind = 'SETTLEMENT_TO_IN' AND rec.tx_type <> 'INCOME'::"TransactionType" THEN
      RAISE EXCEPTION 'SETTLEMENT_TO_IN requires personal INCOME';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM settlements st
      WHERE st.id = rec.settlement_id
        AND st.space_id = rec.shared_space_id
        AND st.voided_at IS NULL
        AND st.amount = rec.amount
        AND st.currency = rec.currency
        AND (
          (rec.kind = 'SETTLEMENT_FROM_OUT' AND st.from_user_id = rec.owner_user_id)
          OR (rec.kind = 'SETTLEMENT_TO_IN' AND st.to_user_id = rec.owner_user_id)
        )
    ) THEN
      RAISE EXCEPTION 'settlement cash link does not match settlement';
    END IF;
  ELSIF rec.kind = 'CONTRIBUTION_PAIR' THEN
    IF rec.tx_type <> 'EXPENSE'::"TransactionType" THEN
      RAISE EXCEPTION 'CONTRIBUTION_PAIR personal leg must be EXPENSE';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM financial_transactions sh_inc
      INNER JOIN spaces s ON s.id = sh_inc.space_id
      WHERE s.type = 'SHARED'::"SpaceType"
        AND sh_inc.space_id = rec.shared_space_id
        AND sh_inc.type = 'INCOME'::"TransactionType"
        AND sh_inc.attributed_to_user_id = rec.owner_user_id
        AND sh_inc.voided_at IS NULL
        AND sh_inc.amount = rec.amount
        AND sh_inc.currency = rec.currency
    ) THEN
      RAISE EXCEPTION 'CONTRIBUTION_PAIR requires matching SHARED INCOME with contributor';
    END IF;
  END IF;

  IF rec.tx_voided IS NOT NULL AND EXISTS (
    SELECT 1
    FROM shared_expenses se
    WHERE se.id = rec.shared_expense_id AND se.voided_at IS NULL
  ) THEN
    RAISE EXCEPTION 'voided personal transaction cannot link to active shared expense';
  END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ctrg_validate_cross_space_cash_links
  AFTER INSERT OR UPDATE OR DELETE ON cross_space_cash_links
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_cross_space_cash_links();

CREATE CONSTRAINT TRIGGER ctrg_validate_cross_space_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_cross_space_cash_links();

CREATE CONSTRAINT TRIGGER ctrg_validate_cross_space_shared_expenses
  AFTER INSERT OR UPDATE OR DELETE ON shared_expenses
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_cross_space_cash_links();

CREATE CONSTRAINT TRIGGER ctrg_validate_cross_space_settlements
  AFTER INSERT OR UPDATE OR DELETE ON settlements
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_cross_space_cash_links();