-- Rehearsal rollback only. For approved empty objects, never paid/active records.
begin;
do $$begin
 if exists(select 1 from essay_private.exam_unit_runs)
 or exists(select 1 from essay_private.exam_unit_questions)
 or exists(select 1 from essay_private.exam_unit_cycles) then
   raise exception 'ROLLBACK_DENIED_NONEMPTY: disable admission, reconcile reservations and retain audit data';
 end if;
end$$;
drop table essay_private.exam_unit_runs;
drop table essay_private.exam_unit_questions;
drop table essay_private.exam_unit_cycles;
commit;
