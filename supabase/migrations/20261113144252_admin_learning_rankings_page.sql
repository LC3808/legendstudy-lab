begin;
create function public.admin_learning_rankings_page(p_from timestamptz,p_to timestamptz,p_kind text,p_page integer default 1,p_page_size integer default 10,p_search text default '') returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='8s' as $fn$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '400 days' then raise sqlstate 'PT422' using message='INVALID_PERIOD';end if;
 if p_kind is null or p_kind not in ('targets','saved','recent','applications') or p_page is null or p_page<1 or p_page>1000000 or p_page_size is null or p_page_size<1 or p_page_size>100 or p_search is null or length(p_search)>200 then raise sqlstate 'PT422' using message='INVALID_PAGE';end if;
 with eligible as materialized (select id from public.profiles where account_private.allowed(id)),
 facts as (
 select 'targets'::text kind,t.university_id::text label,t.user_id from public.student_target_universities t join eligible e on e.id=t.user_id where t.created_at>=p_from and t.created_at<p_to
 union all select 'saved',b.content_item_id::text,b.user_id from public.bookmarks b join eligible e on e.id=b.user_id where b.created_at>=p_from and b.created_at<p_to
 union all select 'recent',r.content_item_id::text,r.user_id from public.recent_views r join eligible e on e.id=r.user_id where r.viewed_at>=p_from and r.viewed_at<p_to
 union all select 'applications',a.university_id::text,a.user_id from public.student_applications a join eligible e on e.id=a.user_id where a.created_at>=p_from and a.created_at<p_to
 ),
 grouped as (select label id,count(*) records,count(distinct user_id) users from facts where kind=p_kind group by label),
 named as (select *,coalesce(case when p_kind in ('targets','applications') then (select name from public.universities where id::text=g.id) else (select title from public.content_items where id::text=g.id) end,'명칭 확인 필요') label from grouped g),
 filtered as (select * from named where strpos(lower(label),lower(btrim(p_search)))>0),
 ranked as (select *,row_number() over(order by users desc,id) rank from filtered),
 page_rows as (select * from ranked order by rank limit p_page_size offset (p_page::bigint-1)*p_page_size)
 select jsonb_build_object('version','admin-learning-rankings-v1','as_of',statement_timestamp(),'kind',p_kind,'page',p_page,'page_size',p_page_size,'total_count',(select count(*) from filtered),'total_pages',(select ceil(count(*)::numeric/p_page_size)::int from filtered),'sort','users_desc_id_asc','rows',coalesce((select jsonb_agg(to_jsonb(p) order by rank) from page_rows p),'[]'::jsonb)) into result;
 return result;
end $fn$;
revoke all on function public.admin_learning_rankings_page(timestamptz,timestamptz,text,integer,integer,text) from public,anon;
grant execute on function public.admin_learning_rankings_page(timestamptz,timestamptz,text,integer,integer,text) to authenticated;
commit;
