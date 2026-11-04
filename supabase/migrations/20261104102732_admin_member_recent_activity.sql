begin;
create or replace function public.admin_member_recent_activity(p_account_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if p_account_id is null then raise invalid_parameter_value;end if;
 if not account_private.allowed(p_account_id) then raise insufficient_privilege;end if;
 if not exists(select 1 from auth.users where id=p_account_id) then raise sqlstate 'PT404' using message='MEMBER_NOT_FOUND';end if;
 select jsonb_build_object('version','admin-member-activity-v1','as_of',statement_timestamp(),'account_id',p_account_id,
 'bookmarks_total',(select count(*) from public.bookmarks where user_id=p_account_id),
 'recent_total',(select count(*) from public.recent_views where user_id=p_account_id),
 'bookmarks',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc,r.id desc) from (
 select b.id,b.content_item_id,coalesce(c.title,'자료명 확인 필요') title,c.source_url,b.created_at at
 from public.bookmarks b left join public.content_items c on c.id=b.content_item_id where b.user_id=p_account_id order by b.created_at desc,b.id desc limit 5)r),'[]'),
 'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc,r.id desc) from (
 select v.id,v.content_item_id,coalesce(c.title,'자료명 확인 필요') title,c.source_url,v.viewed_at at
 from public.recent_views v left join public.content_items c on c.id=v.content_item_id where v.user_id=p_account_id order by v.viewed_at desc,v.id desc limit 5)r),'[]')) into result;
 return result;
end$$;
revoke all on function public.admin_member_recent_activity(uuid) from public,anon,service_role;
grant execute on function public.admin_member_recent_activity(uuid) to authenticated;
commit;
