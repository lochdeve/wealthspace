-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('SPACE_ACCOUNT', 'CASH', 'EXTERNAL_PERSONAL');

-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('EQUAL', 'PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "personal_space_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" UUID NOT NULL,
    "type" "SpaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "display_currency" CHAR(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_memberships" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "space_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_invitations" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "space_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "type" "CategoryType" NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "attributed_to_user_id" UUID,
    "account_id" UUID,
    "source_account_id" UUID,
    "destination_account_id" UUID,
    "category_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_expenses" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "payment_source" "PaymentSource" NOT NULL,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "description" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "split_mode" "SplitMode" NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "paid_by_user_id" UUID,
    "financial_transaction_id" UUID,
    "category_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shared_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_participants" (
    "id" UUID NOT NULL,
    "shared_expense_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name_snapshot" TEXT NOT NULL,
    "allocated_amount" DECIMAL(19,4) NOT NULL,
    "share_percent" DECIMAL(7,4),

    CONSTRAINT "expense_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'CONFIRMED',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "recorded_by_user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_revisions" (
    "id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by_user_id" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "financial_transaction_id" UUID,
    "shared_expense_id" UUID,
    "settlement_id" UUID,

    CONSTRAINT "financial_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_personal_space_id_key" ON "users"("personal_space_id");

-- CreateIndex
CREATE INDEX "space_memberships_space_id_status_idx" ON "space_memberships"("space_id", "status");

-- CreateIndex
CREATE INDEX "space_memberships_user_id_status_idx" ON "space_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "space_invitations_space_id_status_idx" ON "space_invitations"("space_id", "status");

-- CreateIndex
CREATE INDEX "space_invitations_email_status_idx" ON "space_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "accounts_space_id_archived_at_idx" ON "accounts"("space_id", "archived_at");

-- CreateIndex
CREATE INDEX "categories_space_id_type_idx" ON "categories"("space_id", "type");

-- CreateIndex
CREATE INDEX "budgets_space_id_period_start_period_end_idx" ON "budgets"("space_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "financial_transactions_space_id_occurred_at_idx" ON "financial_transactions"("space_id", "occurred_at");

-- CreateIndex
CREATE INDEX "financial_transactions_space_id_type_occurred_at_idx" ON "financial_transactions"("space_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "financial_transactions_account_id_occurred_at_idx" ON "financial_transactions"("account_id", "occurred_at");

-- CreateIndex
CREATE INDEX "financial_transactions_attributed_to_user_id_occurred_at_idx" ON "financial_transactions"("attributed_to_user_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "shared_expenses_financial_transaction_id_key" ON "shared_expenses"("financial_transaction_id");

-- CreateIndex
CREATE INDEX "shared_expenses_space_id_occurred_at_idx" ON "shared_expenses"("space_id", "occurred_at");

-- CreateIndex
CREATE INDEX "shared_expenses_space_id_payment_source_idx" ON "shared_expenses"("space_id", "payment_source");

-- CreateIndex
CREATE INDEX "expense_participants_user_id_idx" ON "expense_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_participants_shared_expense_id_user_id_key" ON "expense_participants"("shared_expense_id", "user_id");

-- CreateIndex
CREATE INDEX "settlements_space_id_occurred_at_idx" ON "settlements"("space_id", "occurred_at");

-- CreateIndex
CREATE INDEX "settlements_space_id_status_idx" ON "settlements"("space_id", "status");

-- CreateIndex
CREATE INDEX "financial_revisions_financial_transaction_id_idx" ON "financial_revisions"("financial_transaction_id");

-- CreateIndex
CREATE INDEX "financial_revisions_shared_expense_id_idx" ON "financial_revisions"("shared_expense_id");

-- CreateIndex
CREATE INDEX "financial_revisions_settlement_id_idx" ON "financial_revisions"("settlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_revisions_financial_transaction_id_revision_numbe_key" ON "financial_revisions"("financial_transaction_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "financial_revisions_shared_expense_id_revision_number_key" ON "financial_revisions"("shared_expense_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "financial_revisions_settlement_id_revision_number_key" ON "financial_revisions"("settlement_id", "revision_number");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_personal_space_id_fkey" FOREIGN KEY ("personal_space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_memberships" ADD CONSTRAINT "space_memberships_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_memberships" ADD CONSTRAINT "space_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_attributed_to_user_id_fkey" FOREIGN KEY ("attributed_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_source_account_id_fkey" FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_expenses" ADD CONSTRAINT "shared_expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_shared_expense_id_fkey" FOREIGN KEY ("shared_expense_id") REFERENCES "shared_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_revisions" ADD CONSTRAINT "financial_revisions_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_revisions" ADD CONSTRAINT "financial_revisions_financial_transaction_id_fkey" FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_revisions" ADD CONSTRAINT "financial_revisions_shared_expense_id_fkey" FOREIGN KEY ("shared_expense_id") REFERENCES "shared_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_revisions" ADD CONSTRAINT "financial_revisions_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ========== custom integrity (manual) — edit prisma/sql/custom-integrity.sql ==========
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
      AND "source_account_id" IS NULL AND "destination_account_id" IS NULL
      AND "attributed_to_user_id" IS NULL)
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
    ("payment_source" = 'CASH'
      AND "paid_by_user_id" IS NOT NULL AND "financial_transaction_id" IS NULL)
    OR ("payment_source" = 'EXTERNAL_PERSONAL'
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
BEGIN
  IF NOT wealthspace_user_member_at(NEW.space_id, NEW.from_user_id, NEW.occurred_at) THEN
    RAISE EXCEPTION 'from_user_id was not a member at occurred_at';
  END IF;
  IF NOT wealthspace_user_member_at(NEW.space_id, NEW.to_user_id, NEW.occurred_at) THEN
    RAISE EXCEPTION 'to_user_id was not a member at occurred_at';
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
    WHERE ft.type = 'EXPENSE'::"TransactionType"
      AND ft.attributed_to_user_id IS NULL
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
BEGIN
  SELECT se.total_amount INTO total_amount
  FROM shared_expenses se
  WHERE se.id = p_shared_expense_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::integer, COALESCE(SUM(allocated_amount), 0)
  INTO cnt, sum_alloc
  FROM expense_participants
  WHERE shared_expense_id = p_shared_expense_id;

  IF cnt < 2 THEN
    RAISE EXCEPTION 'SharedExpense % must have at least two participants (has %)', p_shared_expense_id, cnt;
  END IF;

  IF sum_alloc <> total_amount THEN
    RAISE EXCEPTION 'SharedExpense % participant sum % <> total %', p_shared_expense_id, sum_alloc, total_amount;
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
