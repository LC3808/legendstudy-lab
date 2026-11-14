-- Refuses rollback if any newly accepted >80-code-point name exists.
-- No data is changed. Keep the new validator if this guard fails; reverting it
-- would block those names on unrelated future profile saves.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
lock table public.profiles in share row exclusive mode;
do $$begin
 if exists(select 1 from public.profiles where display_name is not null and
   (char_length(btrim(display_name))<1 or char_length(btrim(display_name))>80)) then
  raise exception 'Rollback refused: existing names require grapheme policy; no data changed';
 end if;
end$$;
alter table public.profiles add constraint profiles_display_name_check
check(display_name is null or char_length(btrim(display_name)) between 1 and 80);
drop trigger profiles_nickname_grapheme on public.profiles;
drop function nickname_private.validate_profile_name();
drop function nickname_private.grapheme_length(text);
drop function nickname_private.gcb(integer);
drop function nickname_private.incb(integer);
drop function nickname_private.ep(integer);
drop schema nickname_private;
commit;
