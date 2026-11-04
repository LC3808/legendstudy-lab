begin;
create or replace function public.admin_member_composition(p_from timestamptz,p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise insufficient_privilege;end if;
 if (p_from is null)<>(p_to is null) or (p_from is not null and (not isfinite(p_from) or not isfinite(p_to) or p_from>=p_to or p_to-p_from>interval '400 days')) then raise invalid_parameter_value;end if;
 with members as materialized(select u.id,p.id profile_id,p.grade_level,p.academic_status,p.neis_office_code office,p.neis_school_code school
 from auth.users u left join public.profiles p on p.id=u.id where p_from is null or (u.created_at>=p_from and u.created_at<p_to)),
 grades as(select case when academic_status='retaker' then 'N수·검정고시 등' when grade_level is not null then '고'||grade_level else '미입력' end label,count(*) count from members where profile_id is not null group by 1),
 schools as(select office,school,count(*) count from members where school is not null group by 1,2)
 select jsonb_build_object('accounts',(select count(*) from members),'profiles',(select count(profile_id) from members),'school_members',(select count(school) from members),
 'active',(select count(distinct s.user_id) from public.study_sessions s join members m on m.id=s.user_id where s.include_in_study_total and s.ended_at is not null and s.started_at<coalesce(p_to,statement_timestamp()) and s.ended_at>coalesce(p_from,statement_timestamp()-interval '30 days') and jsonb_array_length(s.active_segments)>0),
 'grades',coalesce((select jsonb_agg(to_jsonb(g) order by label) from grades g),'[]'),
 'schools',coalesce((select jsonb_agg(to_jsonb(t)) from (select coalesce(c.school_name,'학교명 확인 필요') label,s.office office_code,s.school school_code,s.count from schools s left join student_private.school_display_cache c on c.office_code=s.office and c.school_code=s.school order by s.count desc,s.office,s.school limit 20)t),'[]')) into result;
 return result;
end$$;
revoke all on function public.admin_member_composition(timestamptz,timestamptz) from public,anon,service_role;
grant execute on function public.admin_member_composition(timestamptz,timestamptz) to authenticated;


commit;
