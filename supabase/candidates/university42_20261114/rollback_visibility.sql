-- Emergency only. Do not delete identities or user references. NOT EXECUTED.
-- Revert Catalog API deployment first; this disables NEW selection of these 7 universities.
begin;
set local lock_timeout='5s';
create temporary table _rollback_ids(id uuid primary key,slug text) on commit drop;
insert into _rollback_ids values
('550973d4-e672-4a5a-90f0-8f2ba5a95d55'::uuid,'dongduk'),
('8540780d-01e6-4361-8190-1768cf4cdbca'::uuid,'eulji'),
('cd20d37c-916a-4910-bb9c-6efb0bc67f67'::uuid,'hanshin'),
('62171755-3e5c-406d-9f87-4ee0df4c70de'::uuid,'seokyeong'),
('7b8ae450-5e6e-49bc-a69c-272bd0214ddf'::uuid,'shinhan'),
('4e93f243-74e7-4f8e-b58b-fa537a39ddf8'::uuid,'suwon'),
('d25c9a74-4969-4143-872c-1c850338dd0b'::uuid,'tukorea');
do $$ begin
if (select count(*) from public.universities u join _rollback_ids r using(id,slug))<>7 then
 raise exception 'ROLLBACK_IDENTITY_MISMATCH'; end if;
end $$;
update public.universities u set is_active=false from _rollback_ids r where u.id=r.id and u.slug=r.slug;
-- Verify exactly these seven inactive; keep IDs/history/references. RLS/function definitions unchanged.
select u.id,u.slug,u.is_active from public.universities u join _rollback_ids r using(id,slug);
commit;
