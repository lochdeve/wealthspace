#!/usr/bin/env bash
# Regenerates migrations/20260328183000_init/migration.sql from Prisma schema + custom-integrity.sql
# Source of truth for manual SQL: prisma/sql/custom-integrity.sql
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/migrations/20260328183000_init/migration.sql"
TMP="$(mktemp)"
cd "$ROOT/.."
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > "$TMP"
{
  cat "$TMP"
  echo ""
  echo "-- ========== custom integrity (manual) — edit prisma/sql/custom-integrity.sql =========="
  cat "$ROOT/sql/custom-integrity.sql"
} > "$OUT"
rm "$TMP"
echo "Wrote $OUT"
