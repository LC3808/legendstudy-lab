"""Existing guarded additive package SQL; no DB access."""
import json
DIMENSIONS=["logical_development","computation_accuracy","final_conclusion"]

def literal(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, int): return str(v)
    if isinstance(v, list): return 'ARRAY['+','.join(literal(x) for x in v)+']::text[]'
    return "'"+v.replace("'", "''")+"'"


def registration_sql(packages):
    statements = ["begin;", "set local lock_timeout='5s';", "set local statement_timeout='60s';"]
    for p in packages:
        statements.append("do $check$ begin if not exists(select 1 from public.essay_questions where id="+
            literal(p['essay_question_id'])+" and essay_exam_id="+literal(p['exam_id'])+
            ") then raise exception 'TASK20_REGISTRY_DRIFT'; end if; end $check$;")
        statements.append("do $collision$ begin if exists(select 1 from public.math_subproblems where essay_question_id="+
            literal(p['essay_question_id'])+" and id<>"+literal(p['ids']['leaf'])+
            ") then raise exception 'TASK20_QUESTION_ALREADY_BOUND'; end if; end $collision$;")
        for table, records in p['existing_schema_rows'].items():
            for row in records:
                # Existing IDs must be byte-equivalent; never overwrite or ignore drift.
                expected=json.dumps(row,ensure_ascii=False,separators=(',',':'))
                statements.append(f"do $row$ declare prior jsonb; begin select to_jsonb(t) into prior from public.{table} t where id={literal(row['id'])}; if prior is not null then if not prior @> {literal(expected)}::jsonb then raise exception 'TASK20_CONTENT_DRIFT'; end if; else insert into public.{table} ({','.join(row)}) values ({','.join(literal(v) for v in row.values())}); end if; end $row$;")
    return '\n'.join(statements+['commit;',''])

