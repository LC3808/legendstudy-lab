-- Read-only; does not submit or change a real user's nickname.
select nickname_private.grapheme_length(repeat('👨‍👩‍👧‍👦',20))=20 as family_20,
 nickname_private.grapheme_length(repeat('é',21))=21 as combining_21,
 exists(select 1 from pg_trigger where tgrelid='public.profiles'::regclass and tgname='profiles_nickname_grapheme' and tgenabled='O') as validation_installed,
 not has_function_privilege('authenticated','nickname_private.validate_profile_name()','EXECUTE') as no_direct_rpc_execute;
