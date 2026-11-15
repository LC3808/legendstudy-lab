SET qa.uid='d5eab102-da92-4c4c-9adb-16d2c9d20e4c';
DO $$ BEGIN
 BEGIN PERFORM public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"1c","request_key":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'); RAISE EXCEPTION 'expected paused'; EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
END $$;
UPDATE payment_private.configuration SET purchase_enabled=true,qa_until=now()+interval '1 hour';
DO $$ DECLARE a jsonb;b jsonb; BEGIN
 BEGIN PERFORM public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"3c","request_key":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'); RAISE EXCEPTION 'expected sku block'; EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL; END;
 a=public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"1c","request_key":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}');
 b=public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"1c","request_key":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}');
 IF a->>'id' IS DISTINCT FROM b->>'id' OR a->>'amount'<>'4900' THEN RAISE EXCEPTION 'idempotency/price'; END IF;
 BEGIN PERFORM public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"1c","request_key":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}'); RAISE EXCEPTION 'expected limit'; EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 UPDATE payment_private.configuration SET qa_until=now()-interval '1 minute';
 BEGIN PERFORM public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"1c","request_key":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'); RAISE EXCEPTION 'expected expiry'; EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL; END;
 b=public.payment_order(jsonb_build_object('dto_version','payment-v1','action','get','id',a->>'id')); IF b->>'id' IS DISTINCT FROM a->>'id' THEN RAISE EXCEPTION 'get broken'; END IF;
END $$;
SET qa.uid='22222222-2222-4222-8222-222222222222';
UPDATE payment_private.configuration SET qa_until=now()+interval '1 hour';
DO $$ BEGIN
 BEGIN PERFORM public.payment_order('{"dto_version":"payment-v1","action":"create","sku":"1c","request_key":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}'); RAISE EXCEPTION 'expected subject block'; EXCEPTION WHEN SQLSTATE 'PT403' THEN NULL; END;
 IF (SELECT count(*) FROM payment_orders)<>1 OR (SELECT count(*) FROM payment_events)<>1 THEN RAISE EXCEPTION 'extra writes'; END IF;
END $$;
