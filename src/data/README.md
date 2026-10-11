# Shared public essay catalog v1

`essay-public-catalog.json` is the deterministic public metadata projection of the
retained Manus V2 research (not the old five fixtures). Source SHA256 is embedded.
42 universities /49 offerings after excluding quarantined future-date LSL27-052;
source50 offerings/53 Master/101 Track rows remain unchanged in the private bundle.

Generate with APP `tool.essay_lab.public_catalog`:

```sh
python3 -m tool.essay_lab.public_catalog \
  --source /absolute/retained/.local/essay-research/catalog.json \
  --identities tool/essay_lab/evidence/catalog-university-identity-20261011.json \
  --out /absolute/legendstudy-lab/src/data/essay-public-catalog.json
```

`sourceUniversityId` and offering/source IDs are existing research identifiers,
shared with APP, never generated WEB IDs. `universityId` is the existing Production
UUID only after exact verified reconciliation;27 matched,15 null. Never use the
source ID as a Supabase UUID, merge campuses, or synthesize missing UUIDs.

Public fields: original university/campus/admission names, checked date, region,
admission year, literal essay-type classification and official source links.
No CORE/NEXT ranking, candidate activation flags, private question/excerpt text,
student data or credentials. Unknown type remains unknown; classification never
selects a Provider. Literal mathematics/science aliases are discovery labels only.

2027 admission metadata is separate from actual past exam years queried via RLS.
Evaluation eligibility is exclusively the per-question server admission. This file
cannot make a university ready or authorize a Credit transaction. Refresh/review
source changes through the same generator; do not hand-edit a second catalog.
