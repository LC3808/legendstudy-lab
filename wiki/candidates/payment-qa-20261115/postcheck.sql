SELECT mode,purchase_enabled,qa_until FROM payment_private.configuration;
SELECT mode,state,grant_state,count(*) FROM public.payment_orders GROUP BY 1,2,3;

