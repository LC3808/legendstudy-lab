#!/usr/bin/env bash
set -euo pipefail
# Isolated cluster only. No production connection string accepted.
PG_BIN=${PG_BIN:-/opt/homebrew/opt/postgresql@17/bin}
TEST_ROOT=$(mktemp -d /tmp/legendstudy-withdrawal.XXXXXX)
trap '"$PG_BIN/pg_ctl" -D "$TEST_ROOT/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TEST_ROOT"' EXIT
"$PG_BIN/initdb" -D "$TEST_ROOT/data" --no-locale -A trust >/dev/null
"$PG_BIN/pg_ctl" -D "$TEST_ROOT/data" -l "$TEST_ROOT/server.log" -o "-h '' -k $TEST_ROOT -p 55439" start >/dev/null
PSQL=("$PG_BIN/psql" -h "$TEST_ROOT" -p 55439 -d postgres -v ON_ERROR_STOP=1 -X -q)
"${PSQL[@]}" -f scripts/withdrawal/schema-fixture.sql
"${PSQL[@]}" -f supabase/candidates/admin_withdrawal_20261111/apply.sql
"${PSQL[@]}" -f scripts/withdrawal/test.sql
"${PSQL[@]}" -f supabase/candidates/admin_withdrawal_20261111/verify.sql
"${PSQL[@]}" -f supabase/candidates/admin_withdrawal_20261111/rollback.sql
"${PSQL[@]}" -c "select public.test_assert(to_regprocedure('public.admin_withdrawal_detail(uuid)') is null,'rollback removes only candidate boundary');"
