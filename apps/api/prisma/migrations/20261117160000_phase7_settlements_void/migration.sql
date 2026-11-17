-- B-7.0 (fase 7): P-12 void on settlements; P-19 historical membership trigger.
-- Draft — apply only after coordination approval. Sync prisma/sql/custom-integrity.sql after apply.

ALTER TABLE "settlements"
  ADD COLUMN "voided_at" TIMESTAMPTZ(6),
  ADD COLUMN "voided_by_user_id" UUID;

ALTER TABLE "settlements"
  ADD CONSTRAINT "settlements_voided_by_user_id_fkey"
  FOREIGN KEY ("voided_by_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "settlements"
SET "voided_at" = "updated_at"
WHERE "status" = 'CANCELLED'::"SettlementStatus";

DROP INDEX IF EXISTS "settlements_space_id_status_idx";

ALTER TABLE "settlements" DROP COLUMN "status";

DROP TYPE "SettlementStatus";

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