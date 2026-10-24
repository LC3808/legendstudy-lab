-- Owner executes in Production only after local verification. Additive reads only.
-- Actual columns/admin_operator contract supplied by Owner on 2026-10-24.
begin;
create function public.admin_release_report(p jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
declare
 kind text; filter_category text; st text; filter_quantity integer; lim integer; off integer;
 start_at timestamptz; end_at timestamptz; result jsonb;
begin
 if not public.admin_operator() then raise sqlstate 'PT401' using message='OPERATOR_REQUIRED'; end if;
 if jsonb_typeof(p) is distinct from 'object' or
  p-array['version','kind','from','to','category','state','quantity','limit','offset']<>'{}'::jsonb or
  p->>'version' is distinct from 'admin-release-v1' then raise sqlstate 'PT422' using message='INVALID_REQUEST'; end if;
 kind:=p->>'kind'; filter_category:=coalesce(p->>'category','all'); st:=coalesce(p->>'state','all');
 start_at:=coalesce((p->>'from')::timestamptz,'-infinity'); end_at:=coalesce((p->>'to')::timestamptz,'infinity');
 lim:=coalesce((p->>'limit')::integer,25); off:=coalesce((p->>'offset')::integer,0); filter_quantity:=(p->>'quantity')::integer;
 if kind is null or kind not in ('dashboard','credit','payment') or start_at>=end_at or
  lim not between 1 and 50 or off not between 0 and 1000000 or
  filter_category not in ('all','purchase','free','admin','consume','expiration','reversal') or
  st not in ('all','paid','cancelled') or (filter_quantity is not null and filter_quantity not in (1,3,5,10))
 then raise sqlstate 'PT422' using message='INVALID_FILTER'; end if;
 if kind='credit' then
  with classified as (
   select t.id,t.created_at,t.transaction_type,t.balance_delta,t.reserved_delta,g.origin,
    case when t.transaction_type='purchase' then 'purchase'
     when t.transaction_type in ('signup_bonus','promotion','compensation','b2b_program') then 'free'
     when t.transaction_type='admin_grant' then 'admin'
     when t.transaction_type='consume' then 'consume'
     when t.transaction_type='expiration' then 'expiration'
     when t.transaction_type in ('refund','adjustment') then 'reversal' else 'reservation' end category
   from public.credit_transactions t join public.credit_grants g on g.id=t.grant_id
   where t.created_at>=start_at and t.created_at<end_at
  ), filtered as (select * from classified where filter_category='all' or classified.category=filter_category),
  page as (select * from filtered order by created_at desc,id desc limit lim offset off)
  select jsonb_build_object('total',(select count(*) from filtered),
   'balance_delta',(select coalesce(sum(balance_delta),0) from filtered),
   'reserved_delta',(select coalesce(sum(reserved_delta),0) from filtered),
   'categories',coalesce((select jsonb_agg(to_jsonb(x) order by x.category) from
    (select category,count(*) count,coalesce(sum(balance_delta),0) balance_delta from filtered group by category) x),'[]'::jsonb),
   'rows',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb)) into result;
 elsif kind='payment' then
  with filtered as (
   select o.* from public.payment_orders o where o.created_at>=start_at and o.created_at<end_at
    and (filter_quantity is null or o.quantity=filter_quantity)
    and (st='all' or st='paid' and o.state='PAID' or st='cancelled' and o.state in ('CANCELLED','PARTIALLY_CANCELLED'))
  ), page as (select id,sku,quantity,amount,currency,mode,state,grant_state,created_at,paid_at from filtered order by created_at desc,id desc limit lim offset off)
  select jsonb_build_object('total',(select count(*) from filtered),
   'paid',coalesce((select jsonb_agg(to_jsonb(x) order by x.mode,x.currency) from
    (select mode,currency,count(*) count,sum(amount) amount from filtered where state='PAID' group by mode,currency) x),'[]'::jsonb),
   'rows',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb)) into result;
 else
  select jsonb_build_object(
   'new_members',(select count(*) from public.profiles where created_at>=start_at and created_at<end_at),
   'credit_granted',(select coalesce(sum(balance_delta),0) from public.credit_transactions where created_at>=start_at and created_at<end_at and transaction_type in ('purchase','signup_bonus','promotion','admin_grant','compensation','b2b_program')),
   'credit_used',(select coalesce(-sum(balance_delta),0) from public.credit_transactions where created_at>=start_at and created_at<end_at and transaction_type='consume'),
   'paid',coalesce((select jsonb_agg(to_jsonb(x) order by x.mode,x.currency) from
    (select mode,currency,count(*) count,sum(amount) amount from public.payment_orders where paid_at>=start_at and paid_at<end_at and state='PAID' group by mode,currency) x),'[]'::jsonb),
   'essay',(select jsonb_build_object('pending',count(*) filter(where state='reserved'),'completed',count(*) filter(where state='completed'),'failed',count(*) filter(where state='failed')) from essay_exam_private.runs where created_at>=start_at and created_at<end_at),
   'study_seconds',(select coalesce(sum(greatest(duration_seconds,0)),0) from public.study_sessions where include_in_study_total is true and ended_at is not null and started_at>=start_at and started_at<end_at),
   'registry',jsonb_build_object('exams',(select count(*) from public.essay_exams),'universities',(select count(distinct university_id) from public.essay_exams),'published_questions',(select count(*) from public.essay_questions where is_published is true))
  ) into result;
 end if;
 return result||jsonb_build_object('version','admin-release-v1','kind',kind,'as_of',statement_timestamp(),'limit',lim,'offset',off);
end $fn$;
revoke all on function public.admin_release_report(jsonb) from public,anon,service_role;
grant execute on function public.admin_release_report(jsonb) to authenticated;
commit;
