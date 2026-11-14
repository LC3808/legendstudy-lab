"""Generate Unicode 16 UAX #29 properties from official UCD files (no user data)."""
from pathlib import Path
import sys
src=Path(sys.argv[1]);out=Path(__file__).parent

def ranges(file,kind):
 rows=[]
 for line in (src/file).read_text().splitlines():
  parts=[x.strip() for x in line.split('#')[0].split(';')]
  if len(parts)<2:continue
  if kind=='incb':
   if len(parts)<3 or parts[1]!='InCB':continue
   val=parts[2]
  elif kind=='ep':
   if parts[1]!='Extended_Pictographic':continue
   val='EP'
  else:val=parts[1]
  cp=parts[0].split('..');rows.append((int(cp[0],16),int(cp[-1],16),val))
 return rows
sql="""-- Unicode 16.0 / UAX #29. Generated from unicode.org UCD; see generate.py.
-- Existing values are untouched; only new or changed names are validated.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
create schema nickname_private;
revoke all on schema nickname_private from public, anon, authenticated;
"""
for name,file,kind in [('gcb','GraphemeBreakProperty.txt','gcb'),('incb','DerivedCoreProperties.txt','incb'),('ep','emoji-data.txt','ep')]:
 rows=ranges(file,kind)
 # Adjacent ranges with identical properties can be merged.
 merged=[]
 for a,b,v in sorted(rows):
  if merged and merged[-1][1]+1==a and merged[-1][2]==v:merged[-1]=(merged[-1][0],b,v)
  else:merged.append((a,b,v))
 sql+=f'create function nickname_private.{name}(cp integer) returns text language sql immutable strict parallel safe set search_path=pg_catalog as $$ select case\n'
 for a,b,v in merged:sql+=f"when cp between {a} and {b} then '{v}'\n"
 sql+="else 'Other' end $$;\n"
sql+='''create function nickname_private.grapheme_length(value text) returns integer
language plpgsql immutable strict parallel safe set search_path=pg_catalog as $$
declare ch text; cp integer; prop text; prev text := ''; ic text;
 n integer:=0; ri integer:=0; ep_chain boolean:=false; zwj_ep boolean:=false;
 consonant boolean:=false; linked boolean:=false; joins boolean;
begin
 if value='' then return 0;end if;
 foreach ch in array regexp_split_to_array(value,'') loop
  cp:=ascii(ch); prop:=nickname_private.gcb(cp); ic:=nickname_private.incb(cp);
  joins:=case
   when prev='' then false
   when prev='CR' and prop='LF' then true
   when prev in ('Control','CR','LF') or prop in ('Control','CR','LF') then false
   when prev='L' and prop in ('L','V','LV','LVT') then true
   when prev in ('LV','V') and prop in ('V','T') then true
   when prev in ('LVT','T') and prop='T' then true
   when prop in ('Extend','ZWJ','SpacingMark') or prev='Prepend' then true
   when ic='Consonant' and consonant and linked then true
   when nickname_private.ep(cp)='EP' and prev='ZWJ' and zwj_ep then true
   when prev='Regional_Indicator' and prop='Regional_Indicator' and ri%2=1 then true
   else false end;
  if not joins then n:=n+1; end if;
  zwj_ep:=(prop='ZWJ' and ep_chain);
  if nickname_private.ep(cp)='EP' then ep_chain:=true;
  elsif prop<>'Extend' then ep_chain:=false; end if;
  if ic='Consonant' then consonant:=true;linked:=false;
  elsif ic='Linker' and consonant then linked:=true;
  elsif ic not in ('Extend','Linker') then consonant:=false;linked:=false; end if;
  if prop='Regional_Indicator' then ri:=ri+1;else ri:=0;end if;
  prev:=prop;
 end loop;
 return n;
end $$;
create function nickname_private.validate_profile_name() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare previous_name text;
begin
 if TG_OP='UPDATE' then
  if new.display_name is not distinct from old.display_name then return new;end if;
 else
  -- INSERT ... ON CONFLICT fires the INSERT trigger before the UPDATE trigger.
  select p.display_name into previous_name from public.profiles p where p.id=new.id;
  if found and new.display_name is not distinct from previous_name then return new;end if;
 end if;
 if new.display_name is null then return new;end if;
 if btrim(new.display_name)='' or nickname_private.grapheme_length(btrim(new.display_name))>20
    or new.display_name ~ ('['||chr(1)||'-'||chr(31)||chr(127)||']') then
  raise exception using errcode='23514',message='INVALID_NICKNAME: maximum 20 graphemes';
 end if;
 return new;
end $$;
revoke all on all functions in schema nickname_private from public, anon, authenticated;
-- The trigger's only privilege is validation; it never writes or returns profile data.
create trigger profiles_nickname_grapheme before insert or update of display_name on public.profiles
for each row execute function nickname_private.validate_profile_name();
alter table public.profiles drop constraint profiles_display_name_check;
commit;
'''
(out/'apply.sql').write_text(sql)
# NUL test vectors cannot be represented in PostgreSQL text; Unicode corpus uses no NUL.
import json
vectors=[]
for line in (src/'GraphemeBreakTest.txt').read_text().splitlines():
 raw=line.split('#')[0].strip()
 if not raw:continue
 tokens=raw.split();value=''.join(chr(int(t,16)) for t in tokens if t not in ['÷','×'])
 vectors.append([value,tokens.count('÷')-1])
(out/'unicode16-vectors.json').write_text(json.dumps(vectors,ensure_ascii=True))
print(f'Generated SQL; {len(vectors)} official test vectors')
