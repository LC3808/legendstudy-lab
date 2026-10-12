"""Explicit local-only PostgreSQL rehearsal with dependency stubs, NOT full DB integration.
Requires a disposable cluster already running on Unix /private/tmp port 55439.
No credential/env URL is accepted; never targets Production.
"""
import subprocess
from pathlib import Path
PSQL='/opt/homebrew/opt/postgresql@17/bin/psql'
BASE=[PSQL,'-X','-A','-t','-h','/private/tmp','-p','55439','-d','postgres','-v','ON_ERROR_STOP=1']
def run(sql,ok=True):
 r=subprocess.run(BASE,input=sql,text=True,capture_output=True)
 if ok and r.returncode:raise AssertionError(r.stderr)
 if not ok and not r.returncode:raise AssertionError('Expected refusal')
 return r

def main():
 assert run('show data_directory;').stdout.strip() == '/private/tmp/legendstudy-materials-pg', 'Wrong local cluster'
 root=Path(__file__).parent/'sql'
 run('create role anon; create role authenticated; create role service_role; create schema essay_private;'+
     ''.join('create table public.'+t+'(id uuid primary key);' for t in ['profiles','essay_exams','essay_questions','essay_billing_decisions']))
 draft=(root/'exam-unit-storage.draft.sql').read_text()
 run(draft)
 assert run("select to_regclass('essay_private.exam_unit_cycles') is null;").stdout.strip() == 't'
 # Only this disposable database commits the draft to test denial and rollback.
 run(draft.replace('\nrollback;','\ncommit;'))
 for role in ['anon','authenticated','service_role']:
  for table in ['exam_unit_cycles','exam_unit_questions','exam_unit_runs']:
   r=run(f'set role {role}; select * from essay_private.{table};',False)
   assert 'permission denied' in r.stderr
 assert run("select count(*) from pg_class where relnamespace='essay_private'::regnamespace and relkind='r' and relrowsecurity and relforcerowsecurity;").stdout.strip() == '3'
 rollback=(root/'rollback-empty-draft.sql').read_text()
 run(rollback)
 run(draft.replace('\nrollback;','\ncommit;'))
 owner='00000000-0000-4000-8000-000000000001';exam='00000000-0000-4000-8000-000000000002';cycle='00000000-0000-4000-8000-000000000003'
 run(f"insert into profiles values ('{owner}'); insert into essay_exams values ('{exam}');")
 # NULL JSON keys must not bypass identity checks.
 run(f"insert into essay_private.exam_unit_cycles values ('{cycle}','{owner}','{exam}','{{}}',now());",False)
 import json
 snapshot=json.dumps({'version':'essay-exam-unit-v1','ownerId':owner,'examId':exam})
 run(f"insert into essay_private.exam_unit_cycles values ('{cycle}','{owner}','{exam}','{snapshot}',now());")
 r=run(rollback,False);assert 'ROLLBACK_DENIED_NONEMPTY' in r.stderr
 print('PASS: local draft rollback, 9 direct-role denials, 3 forced RLS tables, missing identity rejection, empty rollback, nonempty rollback refusal. Dependency stubs only; no billing/concurrency/lifecycle verification.')
if __name__=='__main__':main()
