-- Wealthspace custom integrity (manual — SINGLE SOURCE OF TRUTH)
-- Sync into migration: prisma/scripts/sync-init-migration.sh
-- See docs/architecture/first-migration-design.md

-- ---------------------------------------------------------------------------
-- Composite UNIQUE keys for composite FKs
-- ---------------------------------------------------------------------------
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_space_id_id_key" UNIQUE ("space_id", "id");
ALTER TABLE "categories" ADD CONSTRAINT "categories_space_id_id_key" UNIQUE ("space_id", "id");
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_space_id_id_key" UNIQUE ("space_id", "id");
ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_space_id_id_key" UNIQUE ("space_id", "id");

-- ---------------------------------------------------------------------------
-- Composite foreign keys (cross-space protection)
-- ---------------------------------------------------------------------------
ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_space_account_fkey"
  FOREIGN KEY ("space_id", "account_id") REFERENCES "accounts" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_space_category_fkey"
  FOREIGN KEY ("space_id", "category_id") REFERENCES "categories" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_space_source_account_fkey"
  FOREIGN KEY ("space_id", "source_account_id") REFERENCES "accounts" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_space_destination_account_fkey"
  FOREIGN KEY ("space_id", "destination_account_id") REFERENCES "accounts" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shared_expenses"
  ADD CONSTRAINT "shared_expenses_space_category_fkey"
  FOREIGN KEY ("space_id", "category_id") REFERENCES "categories" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shared_expenses"
  ADD CONSTRAINT "shared_expenses_space_financial_transaction_fkey"
  FOREIGN KEY ("space_id", "financial_transaction_id") REFERENCES "financial_transactions" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_space_category_fkey"
  FOREIGN KEY ("space_id", "category_id") REFERENCES "categories" ("space_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Partial unique index: one ACTIVE membership per (space, user)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "space_memberships_one_active_per_user_space"
  ON "space_memberships" ("space_id", "user_id")
  WHERE "status" = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- CHECK constraints
-- ---------------------------------------------------------------------------
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_amount_by_type_check"
  CHECK (
    ("type" IN ('INCOME', 'EXPENSE', 'TRANSFER') AND "amount" > 0)
    OR ("type" = 'OPENING_BALANCE')
  );

ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_fields_by_type_check"
  CHECK (
    ("type" = 'INCOME' AND "account_id" IS NOT NULL
      AND "source_account_id" IS NULL AND "destination_account_id" IS NULL)
    OR ("type" = 'EXPENSE'
      AND "source_account_id" IS NULL AND "destination_account_id" IS NULL)
    OR ("type" = 'TRANSFER' AND "account_id" IS NULL
      AND "source_account_id" IS NOT NULL AND "destination_account_id" IS NOT NULL
      AND "source_account_id" <> "destination_account_id"
      AND "attributed_to_user_id" IS NULL AND "category_id" IS NULL)
    OR ("type" = 'OPENING_BALANCE' AND "account_id" IS NOT NULL
      AND "source_account_id" IS NULL AND "destination_account_id" IS NULL
      AND "attributed_to_user_id" IS NULL AND "category_id" IS NULL)
  );

ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_total_amount_positive_check"
  CHECK ("total_amount" > 0);

ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_payment_source_check"
  CHECK (
    ("payment_source" = 'MEMBER'
      AND "paid_by_user_id" IS NOT NULL AND "financial_transaction_id" IS NULL)
    OR ("payment_source" = 'SPACE_ACCOUNT'
      AND "paid_by_user_id" IS NULL AND "financial_transaction_id" IS NOT NULL)
  );

ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_allocated_positive_check"
  CHECK ("allocated_amount" > 0);

ALTER TABLE "settlements" ADD CONSTRAINT "settlements_amount_users_check"
  CHECK ("amount" > 0 AND "from_user_id" <> "to_user_id");

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_period_amount_check"
  CHECK ("amount" > 0 AND "period_start" <= "period_end");

ALTER TABLE "financial_revisions" ADD CONSTRAINT "financial_revisions_exactly_one_fk_check"
  CHECK (
    (CASE WHEN "financial_transaction_id" IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN "shared_expense_id" IS NOT NULL THEN 1 ELSE 0 END
     + CASE WHEN "settlement_id" IS NOT NULL THEN 1 ELSE 0 END) = 1
  );

-- ---------------------------------------------------------------------------
-- Helper: membership at instant ( [joined_at, left_at) )
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_user_member_at(
  p_space_id uuid,
  p_user_id uuid,
  p_at timestamptz
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM space_memberships m
    WHERE m.space_id = p_space_id
      AND m.user_id = p_user_id
      AND m.joined_at <= p_at
      AND (m.left_at IS NULL OR p_at < m.left_at)
  );
$$;

CREATE OR REPLACE FUNCTION wealthspace_user_first_joined_at(
  p_space_id uuid,
  p_user_id uuid
) RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT MIN(m.joined_at)
  FROM space_memberships m
  WHERE m.space_id = p_space_id
    AND m.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION wealthspace_user_had_membership(
  p_space_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM space_memberships m
    WHERE m.space_id = p_space_id
      AND m.user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- BEFORE: shared / settlement only in SHARED spaces
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_trg_require_shared_space()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  st "SpaceType";
BEGIN
  SELECT type INTO st FROM spaces WHERE id = NEW.space_id;
  IF st IS DISTINCT FROM 'SHARED'::"SpaceType" THEN
    RAISE EXCEPTION 'Operation requires SHARED space';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shared_expense_shared_space
  BEFORE INSERT OR UPDATE ON shared_expenses
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_require_shared_space();

CREATE TRIGGER trg_settlement_shared_space
  BEFORE INSERT OR UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_require_shared_space();

-- ---------------------------------------------------------------------------
-- BEFORE: settlement membership at occurred_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_trg_settlement_membership_at_occurred()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_from_joined timestamptz;
  v_to_joined timestamptz;
BEGIN
  IF NOT wealthspace_user_had_membership(NEW.space_id, NEW.from_user_id) THEN
    RAISE EXCEPTION 'from_user_id has no membership history in space';
  END IF;
  IF NOT wealthspace_user_had_membership(NEW.space_id, NEW.to_user_id) THEN
    RAISE EXCEPTION 'to_user_id has no membership history in space';
  END IF;

  v_from_joined := wealthspace_user_first_joined_at(NEW.space_id, NEW.from_user_id);
  v_to_joined := wealthspace_user_first_joined_at(NEW.space_id, NEW.to_user_id);

  IF NEW.occurred_at < v_from_joined THEN
    RAISE EXCEPTION 'occurred_at before from_user first joined_at';
  END IF;
  IF NEW.occurred_at < v_to_joined THEN
    RAISE EXCEPTION 'occurred_at before to_user first joined_at';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_settlement_membership_at_occurred
  BEFORE INSERT OR UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_settlement_membership_at_occurred();

-- ---------------------------------------------------------------------------
-- BEFORE: financial transaction business rules
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_trg_financial_tx_business_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  sp "SpaceType";
  acc_currency char(3);
  acc_archived timestamptz;
  cat_type "CategoryType";
BEGIN
  SELECT type INTO sp FROM spaces WHERE id = NEW.space_id;

  IF NEW.type = 'EXPENSE'::"TransactionType"
     AND sp = 'PERSONAL'::"SpaceType"
     AND NEW.account_id IS NULL THEN
    RAISE EXCEPTION 'PERSONAL EXPENSE requires account_id';
  END IF;

  IF NEW.account_id IS NOT NULL THEN
    SELECT currency, archived_at INTO acc_currency, acc_archived
    FROM accounts WHERE id = NEW.account_id;
    IF acc_currency IS DISTINCT FROM NEW.currency THEN
      RAISE EXCEPTION 'Transaction currency must match account currency';
    END IF;
    IF TG_OP = 'INSERT' AND acc_archived IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot post to archived account';
    END IF;
  END IF;

  IF NEW.source_account_id IS NOT NULL OR NEW.destination_account_id IS NOT NULL THEN
    IF NEW.type = 'TRANSFER'::"TransactionType" THEN
      PERFORM 1 FROM accounts a
      WHERE a.id = NEW.source_account_id AND a.archived_at IS NOT NULL;
      IF FOUND AND TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'Cannot transfer from archived account';
      END IF;
      PERFORM 1 FROM accounts a
      WHERE a.id = NEW.destination_account_id AND a.archived_at IS NOT NULL;
      IF FOUND AND TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'Cannot transfer to archived account';
      END IF;
    END IF;
  END IF;

  IF NEW.category_id IS NOT NULL THEN
    SELECT type INTO cat_type FROM categories WHERE id = NEW.category_id;
    IF NEW.type = 'INCOME'::"TransactionType" AND cat_type <> 'INCOME'::"CategoryType" THEN
      RAISE EXCEPTION 'INCOME requires INCOME category';
    END IF;
    IF NEW.type = 'EXPENSE'::"TransactionType" AND cat_type <> 'EXPENSE'::"CategoryType" THEN
      RAISE EXCEPTION 'EXPENSE requires EXPENSE category';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financial_tx_business_rules
  BEFORE INSERT OR UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_financial_tx_business_rules();

-- ---------------------------------------------------------------------------
-- BEFORE: immutable account / category / space fields when referenced
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_trg_account_immutable_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.space_id IS DISTINCT FROM OLD.space_id OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    IF EXISTS (
      SELECT 1 FROM financial_transactions ft
      WHERE ft.account_id = OLD.id
         OR ft.source_account_id = OLD.id
         OR ft.destination_account_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot change account space_id or currency with existing transactions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_account_immutable_refs
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_account_immutable_refs();

CREATE OR REPLACE FUNCTION wealthspace_trg_category_immutable_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.space_id IS DISTINCT FROM OLD.space_id OR NEW.type IS DISTINCT FROM OLD.type THEN
    IF EXISTS (
      SELECT 1 FROM financial_transactions ft WHERE ft.category_id = OLD.id
    ) OR EXISTS (
      SELECT 1 FROM shared_expenses se WHERE se.category_id = OLD.id
    ) OR EXISTS (
      SELECT 1 FROM budgets b WHERE b.category_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot change category space_id or type with existing references';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_category_immutable_refs
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_category_immutable_refs();

CREATE OR REPLACE FUNCTION wealthspace_trg_space_type_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type IS DISTINCT FROM OLD.type THEN
    IF EXISTS (SELECT 1 FROM shared_expenses se WHERE se.space_id = OLD.id)
       OR EXISTS (SELECT 1 FROM settlements s WHERE s.space_id = OLD.id) THEN
      RAISE EXCEPTION 'Cannot change space type with shared expenses or settlements';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_space_type_immutable
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_space_type_immutable();

-- ---------------------------------------------------------------------------
-- BEFORE: financial revisions immutable
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_trg_financial_revisions_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'financial_revisions rows are immutable';
END;
$$;

CREATE TRIGGER trg_financial_revisions_immutable
  BEFORE UPDATE OR DELETE ON financial_revisions
  FOR EACH ROW EXECUTE FUNCTION wealthspace_trg_financial_revisions_immutable();

-- ---------------------------------------------------------------------------
-- DEFERRED: SPACE_ACCOUNT pairing (final state at COMMIT)
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

CREATE CONSTRAINT TRIGGER ctrg_validate_space_account_pairing_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_space_account_pairing();

CREATE CONSTRAINT TRIGGER ctrg_validate_space_account_pairing_shared_expenses
  AFTER INSERT OR UPDATE OR DELETE ON shared_expenses
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_space_account_pairing();

-- ---------------------------------------------------------------------------
-- DEFERRED: shared expense participants (final state at COMMIT, dirty-set)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION wealthspace_dirty_shared_ensure_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS wealthspace_dirty_shared_expenses (
    shared_expense_id uuid PRIMARY KEY
  ) ON COMMIT DROP;
END;
$$;

CREATE OR REPLACE FUNCTION wealthspace_dirty_shared_mark(p_shared_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM wealthspace_dirty_shared_ensure_table();
  INSERT INTO wealthspace_dirty_shared_expenses (shared_expense_id)
  VALUES (p_shared_expense_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION wealthspace_participants_track_dirty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM wealthspace_dirty_shared_mark(OLD.shared_expense_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.shared_expense_id IS DISTINCT FROM NEW.shared_expense_id THEN
      PERFORM wealthspace_dirty_shared_mark(OLD.shared_expense_id);
    END IF;
    PERFORM wealthspace_dirty_shared_mark(NEW.shared_expense_id);
    RETURN NEW;
  END IF;
  PERFORM wealthspace_dirty_shared_mark(NEW.shared_expense_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_participants_mark_dirty
  AFTER INSERT OR UPDATE OR DELETE ON expense_participants
  FOR EACH ROW EXECUTE FUNCTION wealthspace_participants_track_dirty();

CREATE OR REPLACE FUNCTION wealthspace_shared_expenses_track_dirty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM wealthspace_dirty_shared_mark(OLD.id);
    RETURN OLD;
  END IF;
  PERFORM wealthspace_dirty_shared_mark(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shared_expenses_mark_dirty
  AFTER INSERT OR UPDATE OF total_amount OR DELETE ON shared_expenses
  FOR EACH ROW EXECUTE FUNCTION wealthspace_shared_expenses_track_dirty();

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

CREATE OR REPLACE FUNCTION wealthspace_validate_shared_expense_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  dirty_id uuid;
BEGIN
  PERFORM wealthspace_dirty_shared_ensure_table();

  FOR dirty_id IN SELECT shared_expense_id FROM wealthspace_dirty_shared_expenses LOOP
    PERFORM wealthspace_validate_one_shared_participants(dirty_id);
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ctrg_validate_shared_expense_participants_expense_participants
  AFTER INSERT OR UPDATE OR DELETE ON expense_participants
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_shared_expense_participants();

CREATE CONSTRAINT TRIGGER ctrg_validate_shared_expense_participants_shared_expenses
  AFTER INSERT OR UPDATE OF total_amount OR DELETE ON shared_expenses
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION wealthspace_validate_shared_expense_participants();

-- ---------------------------------------------------------------------------
-- Phase 8 (B-8.0): cross_space_cash_links + SHARED INCOME contributor (P-05)
-- Table/enum DDL: Prisma migrate phase 8; settlements (space_id,id) unique in schema.
-- ---------------------------------------------------------------------------
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
      IF rec.tx_voided IS NOT NULL THEN
        CONTINUE;
      END IF;
      IF EXISTS (
        SELECT 1
        FROM settlements st
        WHERE st.id = rec.settlement_id
          AND st.space_id = rec.shared_space_id
          AND st.voided_at IS NOT NULL
      ) THEN
        CONTINUE;
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
