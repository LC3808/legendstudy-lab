from pathlib import Path
import sys,os
APP=Path('/Users/woojinchang/.codex/worktrees/app-review-candidate-b-20261103/legendstudy-service-app-20261022')
sys.path.insert(0,str(APP/'tool'));sys.path.insert(0,str(Path(__file__).resolve().parent))
os.environ['TASK16G_LIVE_BASELINE']='1'
src=(APP/'supabase/candidates/task16g_learning_loop/test_session.py').read_text()
needle="  m.o.execute_as_production(c,admin,(ROOT/'loop.sql').read_text())"
assert src.count(needle)==1
src=src.replace(needle,"  from fixture_support import install_and_negative\n  install_and_negative(c,admin,m.o.execute_as_production)")
for line in ["  m.o.execute_as_production(c,admin,(ROOT/'coaching.test.sql').read_text())", "  m.o.execute_as_production(c,admin,(APP/'supabase/candidates/task16f_math_coaching/002_disclosure_boundary.sql').read_text())", "  m.o.execute_as_production(c,admin,(ROOT/'coaching_cycles.sql').read_text())"]:
 assert src.count(line)==1;src=src.replace(line,'  pass # Already included atomically in release57 incremental candidate')
src=src.replace(" print('TASK16G_COACHING_AND_CYCLE_CONTRACT_COMBINED PASS',flush=True)"," print('TASK16G_COACHING_AND_CYCLE_CONTRACT_COMBINED PASS',flush=True)\n from fixture_support import verify_mixed,verify_coaching\n verify_mixed(c,rpc,new,scalar,A,B)\n verify_coaching(c,rpc,new,scalar,A,B,old_evals[-1])")
src=src.replace('insert into essay_beta_private.test_grants values(%s)','insert into essay_beta_private.test_grants(id) values(%s)')
src=src.replace(" print('TASK16G_14_DAY_BETA_DEADLINE PASS',flush=True)"," c.execute(\"update essay_beta_private.test_grants set revision_cutoff=clock_timestamp()+interval '3 days' where id=%s\",(grant,))\n assert scalar('select math_private.cycle_deadline(%s,%s::timestamptz)',(paidrow['decision_id'],paidrow['completed_at']))==scalar('select revision_cutoff from essay_beta_private.test_grants where id=%s',(grant,))\n print('RELEASE57_BETA_REWRITE_USES_CAMPAIGN_CUTOFF_NOT_DAILY_GRANT_EXPIRY PASS',flush=True)\n print('TASK16G_14_DAY_BETA_DEADLINE PASS',flush=True)")
src=src.replace(" verify_coaching(c,rpc,new,scalar,A,B,old_evals[-1])"," verify_coaching(c,rpc,new,scalar,A,B,old_evals[-1])\n from activation_checks import verify as activation_verify\n activation_verify(c,rpc,new,scalar,A,B,finish)")
exec(compile(src,str(APP/'supabase/candidates/task16g_learning_loop/test_session.py'),'exec'),{'__file__':str(APP/'supabase/candidates/task16g_learning_loop/test_session.py'),'__name__':'__main__'})
