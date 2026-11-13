begin isolation level repeatable read;
set local lock_timeout='5s';
lock table public.universities in share row exclusive mode;
create temporary table _before_universities on commit drop as select id,to_jsonb(u) row from public.universities u;
create temporary table _seven(slug text primary key,name text) on commit drop;
insert into _seven values ('dongduk','동덕여자대학교'),('seokyeong','서경대학교'),('suwon','수원대학교'),('shinhan','신한대학교'),('eulji','을지대학교'),('tukorea','한국공학대학교'),('hanshin','한신대학교');
do $guard$ begin
 if exists(select 1 from public.universities u join _seven s on u.slug=s.slug or regexp_replace(u.name,'\s','','g')=s.name) or exists(select 1 from public.universities where name ~ '(한국산업기술|신흥대|한북대|을지의과|서울보건)' or slug='kpu') then raise exception 'UNIVERSITY_DUPLICATE_OR_ALIAS_REVIEW_REQUIRED';end if;
end $guard$;
create temporary table _preserved on commit drop as
select 'targets' kind,count(*) n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) digest from public.student_target_universities t
union all select 'applications',count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.student_applications t
union all select 'exams',count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.essay_exams t;
insert into public.universities(slug,name,is_active) select slug,name,true from _seven;
do $guard$ begin
 if (select count(*) from public.universities u join _seven s using(slug) where u.name=s.name and u.is_active)<>7 then raise exception 'SEVEN_NOT_EXACT';end if;
 if exists(select 1 from _before_universities b left join public.universities u using(id) where b.row is distinct from to_jsonb(u)) then raise exception 'OLD_UNIVERSITIES_CHANGED';end if;
 if exists(select 1 from _preserved p join (select 'targets' kind,count(*) n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) digest from public.student_target_universities t union all select 'applications',count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.student_applications t union all select 'exams',count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) from public.essay_exams t) n using(kind) where p.n<>n.n or p.digest<>n.digest) then raise exception 'EXISTING_REFERENCES_CHANGED';end if;
end $guard$;
commit;
