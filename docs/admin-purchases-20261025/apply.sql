BEGIN;
CREATE FUNCTION public.admin_mobile_purchase_report(p_from timestamptz DEFAULT NULL,p_to timestamptz DEFAULT NULL,p_quantity integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF NOT public.admin_operator() OR NOT account_private.allowed(auth.uid()) THEN RAISE SQLSTATE '42501' USING MESSAGE='OPERATOR_REQUIRED'; END IF;
 IF coalesce(p_from,'-infinity')>=coalesce(p_to,'infinity') OR (p_quantity IS NOT NULL AND p_quantity NOT IN (1,3,5,10)) THEN RAISE SQLSTATE '22023' USING MESSAGE='INVALID_FILTER'; END IF;
 RETURN jsonb_build_object('version','admin-mobile-purchase-v1','as_of',statement_timestamp(),'basis','CREDIT_GRANTED_AT','amount_available',false,'environment_available',false,
 'platforms',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.platform) FROM (
 SELECT CASE t.reason_code WHEN 'iap_apple_v1' THEN 'apple' ELSE 'google' END platform,
 count(*) purchase_count,sum(t.balance_delta) granted_credits
 FROM public.credit_transactions t JOIN public.credit_grants g ON g.id=t.grant_id
 WHERE g.origin='purchase' AND t.transaction_type='purchase' AND t.reason_code IN ('iap_apple_v1','iap_google_v1')
 AND t.created_at>=coalesce(p_from,'-infinity') AND t.created_at<coalesce(p_to,'infinity')
 AND (p_quantity IS NULL OR t.balance_delta=p_quantity)
 GROUP BY t.reason_code) s),'[]'::jsonb));
END $fn$;
ALTER FUNCTION public.admin_mobile_purchase_report(timestamptz,timestamptz,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_mobile_purchase_report(timestamptz,timestamptz,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_mobile_purchase_report(timestamptz,timestamptz,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
