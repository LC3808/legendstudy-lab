-- Apply after notice_rich_v1. Preserve existing grants, records and image visibility policies.
begin;
-- Both functions must already exist so CREATE OR REPLACE retains their restricted ACL.
do $$ begin
 perform 'public.notice_admin_save_rich(jsonb)'::regprocedure,
         'public.notice_editor_capability()'::regprocedure;
end $$;
create or replace function public.notice_admin_save_rich(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare attr record; n notice_private.notices; id uuid; old_time timestamptz; doc jsonb; block jsonb; plain text := ''; image_count integer := 0;
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise exception 'FORBIDDEN' using errcode='42501'; end if;

 doc:=p->'content_document';
 if doc is null or jsonb_typeof(doc) <> 'object' or coalesce(doc->'version','null') not in ('1'::jsonb,'2'::jsonb) or jsonb_typeof(doc->'blocks') is distinct from 'array' then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
 if jsonb_array_length(doc->'blocks') not between 1 and (case when doc->>'version'='1' then 100 else 5000 end) or octet_length(doc::text)>250000 then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
 for block in select value from jsonb_array_elements(doc->'blocks') loop
   if block->>'type'='text' and doc->>'version'='2' then
     if (block - array['type','text','attributes']) <> '{}'::jsonb or jsonb_typeof(block->'text') is distinct from 'string'
       or jsonb_typeof(coalesce(block->'attributes','{}')) <> 'object' then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
     for attr in select * from jsonb_each(block->'attributes') loop
       if not (case
         when attr.key in ('bold','italic','underline','strike','blockquote') then attr.value='true'::jsonb
         when attr.key in ('color','background') then attr.value::text ~ '^"#[0-9A-Fa-f]{6}"$'
         when attr.key='size' then attr.value::text ~ '^"(12|14|16|18|22|28|36)px"$'
         when attr.key='header' then attr.value in ('1'::jsonb,'2'::jsonb)
         when attr.key='indent' then attr.value::text ~ '^[1-8]$'
         when attr.key='list' then attr.value::text in ('"ordered"','"bullet"')
         when attr.key='align' then attr.value::text in ('"right"','"justify"','"center"')
         when attr.key='link' then jsonb_typeof(attr.value)='string' and length(attr.value #>> '{}')<=2048 and (attr.value #>> '{}') ~* '^https?://[^[:space:]]+$'
         else false end) then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
     end loop;
     plain:=plain || (block->>'text');
   elsif block->>'type'='text' then
     if jsonb_typeof(block->'text') is distinct from 'string' or jsonb_typeof(block->'bold') is distinct from 'boolean' or jsonb_typeof(block->'underline') is distinct from 'boolean' or block->>'size' is null or block->>'size' not in ('16','18','22','28') then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
     plain:=plain || E'\n\n' || (block->>'text');
   elsif block->>'type'='image' then
     image_count:=image_count+1;
     if image_count>8 or jsonb_typeof(block->'alt') is distinct from 'string' or length(trim(block->>'alt')) not between 1 and 300 or jsonb_typeof(block->'path') is distinct from 'string' or (block->>'path') !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.webp$' then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
     if not exists(select 1 from storage.objects where bucket_id='notice-media' and name=block->>'path') then raise exception 'NOTICE_IMAGE_MISSING'; end if;
     plain:=plain || (case when doc->>'version'='2' then E'\n' else E'\n\n' end) || '[이미지: ' || (block->>'alt') || ']' || (case when doc->>'version'='2' then E'\n' else '' end);
   else raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
 end loop;
 if length(plain)>50000 then raise exception 'INVALID_NOTICE_DOCUMENT'; end if;
 p:=p || jsonb_build_object('content',trim(plain,E' \n\r\t'));
 id:=nullif(p->>'notice_id','')::uuid;
 if id is not null then
 select * into n from notice_private.notices where notice_id=id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 old_time:=nullif(p->>'updated_at','')::timestamptz;
 if n.content_document->>'version'='2' and doc->>'version'='1' then raise exception 'NOTICE_EDITOR_UPDATE_REQUIRED'; end if;
 if old_time is distinct from n.updated_at then raise exception 'NOTICE_CONFLICT'; end if;
 else id:=gen_random_uuid(); end if;
 insert into notice_private.notices(notice_id,title,content,content_document,category,status,is_pinned,is_public,show_app,show_web,published_at,expires_at,created_by)
 values(id,trim(p->>'title'),trim(p->>'content'),doc,p->>'category',p->>'status',coalesce((p->>'is_pinned')::boolean,false),coalesce((p->>'is_public')::boolean,true),coalesce((p->>'show_app')::boolean,true),coalesce((p->>'show_web')::boolean,true),nullif(p->>'published_at','')::timestamptz,nullif(p->>'expires_at','')::timestamptz,auth.uid())
 on conflict(notice_id) do update set title=excluded.title,content=excluded.content,content_document=excluded.content_document,category=excluded.category,status=excluded.status,is_pinned=excluded.is_pinned,is_public=excluded.is_public,show_app=excluded.show_app,show_web=excluded.show_web,published_at=excluded.published_at,expires_at=excluded.expires_at,updated_at=clock_timestamp()
 returning * into n;
 insert into notice_private.revisions(notice_id,actor,snapshot) values(id,auth.uid(),to_jsonb(n)-'created_by');
 return to_jsonb(n);
end $$;

create or replace function public.notice_editor_capability() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.admin_operator() or not account_private.allowed(auth.uid()) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return jsonb_build_object('version',2);
end $$;
commit;
