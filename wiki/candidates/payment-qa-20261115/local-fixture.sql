CREATE SCHEMA payment_private; CREATE SCHEMA essay_private; CREATE SCHEMA account_private;
CREATE TABLE payment_private.configuration(singleton boolean primary key,mode text); INSERT INTO payment_private.configuration VALUES(true,'LIVE');
CREATE FUNCTION essay_private.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('qa.uid',true),'')::uuid$$;
CREATE FUNCTION account_private.lock_subject(uuid) RETURNS void LANGUAGE sql AS $$SELECT pg_advisory_xact_lock(hashtext($1::text))$$;
CREATE FUNCTION account_private.allowed(uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;
CREATE FUNCTION payment_private.current_order_mode() RETURNS text LANGUAGE sql AS $$SELECT mode FROM payment_private.configuration WHERE singleton$$;
CREATE TABLE public.payment_orders(id uuid primary key default gen_random_uuid(),subject_id uuid,request_key uuid,mode text,sku text,amount integer,quantity integer,created_at timestamptz default now(),unique(subject_id,request_key));
CREATE TABLE public.payment_events(order_id uuid,event text);
CREATE FUNCTION payment_private.result(uuid) RETURNS jsonb LANGUAGE sql AS $$SELECT to_jsonb(o) FROM public.payment_orders o WHERE id=$1$$;
