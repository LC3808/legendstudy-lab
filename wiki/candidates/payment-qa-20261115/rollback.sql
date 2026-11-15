-- Restore exact inspected function; no historical orders or credit records touched.
BEGIN;
CREATE OR REPLACE FUNCTION public.payment_order(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid=essay_private.uid();o public.payment_orders;v_mode text;n integer;a integer;
begin
 if u is null then raise sqlstate 'PT401' using message='UNAUTHENTICATED';end if;
 -- Match account lifecycle lock order; no implicit ADR installation/activation.
 if to_regprocedure('account_private.lock_subject(uuid)') is null then raise sqlstate 'PT503' using message='LIFECYCLE_PREREQUISITE';end if;
 perform account_private.lock_subject(u);
 if not account_private.allowed(u) then raise sqlstate 'PT403' using message='ACCOUNT_RESTRICTED';end if;
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>2048 or p->>'dto_version' is distinct from 'payment-v1' then raise sqlstate 'PT422' using message='INVALID_REQUEST';end if;
 if p->>'action'='create' then
  if p-array['dto_version','action','sku','request_key']<>'{}'::jsonb or nullif(p->>'request_key','') is null then raise sqlstate 'PT422' using message='INVALID_REQUEST';end if;
  v_mode=payment_private.current_order_mode();
  if v_mode is null then raise sqlstate 'PT503' using message='MODE_UNAVAILABLE';end if;
  select quantity,price into n,a from (values('1c',1,4900),('3c',3,11900),('5c',5,17900),('10c',10,29900)) x(sku,quantity,price) where sku=p->>'sku';
  if n is null then raise sqlstate 'PT422' using message='INVALID_SKU';end if;
  insert into public.payment_orders(subject_id,request_key,mode,sku,amount,quantity) values(u,(p->>'request_key')::uuid,v_mode,p->>'sku',a,n) on conflict(subject_id,request_key) do nothing returning * into o;
  if o.id is null then
   select * into o from public.payment_orders where subject_id=u and request_key=(p->>'request_key')::uuid;
   if o.sku is distinct from p->>'sku' then raise sqlstate 'PT409' using message='IDEMPOTENCY_CONFLICT';end if;
  else insert into public.payment_events(order_id,event) values(o.id,'CREATED');end if;
 elsif p->>'action'='get' then
  if p-array['dto_version','action','id']<>'{}'::jsonb then raise sqlstate 'PT422' using message='INVALID_REQUEST';end if;
  select * into o from public.payment_orders where id=(p->>'id')::uuid and subject_id=u;
  if o.id is null then raise sqlstate 'PT404' using message='ORDER_NOT_FOUND';end if;
 else raise sqlstate 'PT422' using message='INVALID_ACTION';end if;
 return payment_private.result(o.id);
end$function$;

ALTER TABLE payment_private.configuration DROP COLUMN purchase_enabled, DROP COLUMN qa_started_at, DROP COLUMN qa_until;
COMMIT;

