begin;
set local lock_timeout='3s';
do $guard$ begin
 if md5((select prosrc from pg_proc where oid=to_regprocedure('public.admin_lab_runs_filtered(uuid,uuid,uuid,text,text,integer,text,timestamptz,timestamptz)'))) IS DISTINCT FROM 'c3d9dc35f7bb089a6d5907a8e45ef711' then raise exception 'INSTALLED_FUNCTION_DRIFT';end if;
end $guard$;
DROP FUNCTION public.admin_lab_runs_filtered(uuid,uuid,uuid,text,text,integer,text,timestamptz,timestamptz);
commit;
