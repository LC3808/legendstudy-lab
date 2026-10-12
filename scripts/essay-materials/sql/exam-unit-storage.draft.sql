-- Historical storage-shape rehearsal; do not combine with the newer local atomic
-- candidate in legendstudy-app/supabase/candidates/essay_exam_unit. Neither is deployable.
-- DESIGN REHEARSAL ONLY. NOT a deployable migration. Ends with ROLLBACK.
-- No RPC, grants, ledger writes, source edits, or active runtime binding.
-- Move an approved complete migration into APP's canonical path only after atomic
-- reservation/finalization/History/Quality contracts and authorization tests pass.
begin;
create table essay_private.exam_unit_cycles (
 id uuid primary key,
 owner_id uuid not null references public.profiles(id),
 exam_id uuid not null references public.essay_exams(id),
 initial_snapshot jsonb not null check (jsonb_typeof(initial_snapshot) = 'object'),
 created_at timestamptz not null default now(),
 unique(id, owner_id),
 check (coalesce(initial_snapshot->>'version' = 'essay-exam-unit-v1',false)),
 check (coalesce((initial_snapshot->>'ownerId')::uuid = owner_id,false)),
 check (coalesce((initial_snapshot->>'examId')::uuid = exam_id,false))
);
create table essay_private.exam_unit_questions (
 cycle_id uuid not null references essay_private.exam_unit_cycles(id),
 question_id uuid not null references public.essay_questions(id),
 rubric_version text not null check (length(btrim(rubric_version)) > 0),
 evidence_version text not null check (length(btrim(evidence_version)) > 0),
 primary key(cycle_id, question_id)
);
create table essay_private.exam_unit_runs (
 id uuid primary key,
 cycle_id uuid not null,
 owner_id uuid not null,
 request_key uuid not null,
 input_sha256 text not null check(input_sha256 ~ '^[a-f0-9]{64}$'),
 snapshot jsonb not null check(jsonb_typeof(snapshot) = 'object'),
 parent_run_id uuid,
 billing_decision_id uuid unique references public.essay_billing_decisions(id),
 state text not null check(state in ('pending','processing','reconciling','completed','failed')),
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 foreign key(cycle_id,owner_id) references essay_private.exam_unit_cycles(id,owner_id),
 unique(id,cycle_id,owner_id),
 foreign key(parent_run_id,cycle_id,owner_id) references essay_private.exam_unit_runs(id,cycle_id,owner_id),
 unique(owner_id,request_key),
 check(parent_run_id is null or parent_run_id <> id),
 check(state <> 'completed' or completed_at is not null)
);
create index exam_unit_cycles_owner on essay_private.exam_unit_cycles(owner_id);
create index exam_unit_cycles_exam on essay_private.exam_unit_cycles(exam_id);
create index exam_unit_questions_question on essay_private.exam_unit_questions(question_id);
create index exam_unit_runs_cycle_owner on essay_private.exam_unit_runs(cycle_id,owner_id);
create index exam_unit_runs_parent on essay_private.exam_unit_runs(parent_run_id,cycle_id,owner_id);
-- At most one active/completed initial and one active/completed rewrite per cycle.
-- Failed runs remain append-only; retry authority still requires confirmed release.
create unique index exam_unit_initial_once on essay_private.exam_unit_runs(cycle_id)
 where parent_run_id is null and state <> 'failed';
create unique index exam_unit_rewrite_once on essay_private.exam_unit_runs(cycle_id)
 where parent_run_id is not null and state <> 'failed';
alter table essay_private.exam_unit_cycles enable row level security;
alter table essay_private.exam_unit_cycles force row level security;
alter table essay_private.exam_unit_questions enable row level security;
alter table essay_private.exam_unit_questions force row level security;
alter table essay_private.exam_unit_runs enable row level security;
alter table essay_private.exam_unit_runs force row level security;
revoke all on essay_private.exam_unit_cycles,essay_private.exam_unit_questions,essay_private.exam_unit_runs from public,anon,authenticated,service_role;
-- No policies: default denial. SQL security-definer RPCs have NOT been added.
-- Missing acceptance gates: snapshot/question membership, immutable input, locked
-- 14-day eligibility, one reservation/finalization, fences, lifecycle, History/QA.
rollback;
