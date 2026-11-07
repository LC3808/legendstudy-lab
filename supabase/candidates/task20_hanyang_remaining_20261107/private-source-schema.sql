create table if not exists math_private.task20_hanyang_source_pages(
 question_id uuid primary key references public.essay_questions(id), exam_id uuid not null references public.essay_exams(id),
 manifest jsonb not null, images jsonb not null check(jsonb_typeof(images)='array' and jsonb_array_length(images) between 1 and 24),
 content_sha256 text not null check(length(content_sha256)=64));
alter table math_private.task20_hanyang_source_pages enable row level security;
revoke all on math_private.task20_hanyang_source_pages from public,anon,authenticated;
