-- Pending Owner approval. Read one verified question-only PDF; no data changes.
begin;
do $$begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='hanyang_2024_question_read') then
  create policy hanyang_2024_question_read on storage.objects for select to authenticated
   using (bucket_id='essay-material-originals'
    and name='4f3b87f2197a042c8abdd361584e3e03ab4bd4d15bc5341273dee27b7b6fc73b.pdf'
    and (select public.account_service_allowed()));
 end if;
end$$;
commit;
