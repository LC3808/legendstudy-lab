import copy,hashlib,importlib.util,json,tempfile,unittest
from pathlib import Path
p=Path(__file__).with_name('task20c_compile_packages.py');s=importlib.util.spec_from_file_location('candidate',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class CandidateTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);p=Path(self.tmp.name)/'source';p.write_bytes(b'local fixture only');sha=hashlib.sha256(p.read_bytes()).hexdigest();self.sources={sha:str(p)}
  self.items=[dict(question_id=q,exam_id=e,number=n,label='fixture',source_sha256=sha,pages={r:[1] for r in ['QUESTION','INTENT','SCORING','SOLUTION']},statement="f'(x)=x; not real evidence",intent='fixture',criteria=[dict(key='a',description='fixture',points=1)],solution_steps=['fixture'],total_points=1,review=dict(status='SOURCE_CHECKED'),state='DRAFT',publication_allowed=False,provider_allowed=False) for q,(e,n) in m.TARGETS.items()]
 def test_draft_stable_exact_bindings(self):
  a,manifest=m.compile_packages(self.items,self.sources);b,_=m.compile_packages(self.items,self.sources);self.assertEqual(a,b)
  self.assertEqual({x['essay_question_id'] for x in a['math_subproblems']},set(m.TARGETS));self.assertEqual(len(a['math_source_artifacts']),24)
  self.assertTrue(all(x['state']=='DRAFT' for t in ['math_problem_sets','math_problems','math_evaluation_profiles','math_canonical_solutions'] for x in a[t]))
  sql=m.sql_candidate(a);self.assertNotIn('update public.',sql.lower());self.assertNotIn('insert into public.essay_',sql.lower());self.assertIn("f''(x)",sql)
  self.assertIn('REFERENCED_CONTENT_ROLLBACK_DENIED',m.rollback_candidate(a))
 def test_reject_hash_drift(self):
  Path(next(iter(self.sources.values()))).write_bytes(b'changed')
  with self.assertRaisesRegex(ValueError,'SOURCE_HASH_MISMATCH'):m.compile_packages(self.items,self.sources)
 def test_reject_cross_exam(self):
  self.items[0]['exam_id']=self.items[-1]['exam_id']
  with self.assertRaisesRegex(ValueError,'REGISTRY_MISMATCH'):m.compile_packages(self.items,self.sources)
 def test_reject_invented_missing_criteria(self):
  self.items[0]['criteria']=[]
  with self.assertRaisesRegex(ValueError,'EVIDENCE_MISSING'):m.compile_packages(self.items,self.sources)
 def test_reject_unreviewed_font(self):
  self.items[0]['statement']='x=\ue000'
  with self.assertRaisesRegex(ValueError,'UNRESOLVED_FONT_GLYPH'):m.compile_packages(self.items,self.sources)
 def test_reject_activation(self):
  self.items[0]['state']='ACTIVE'
  with self.assertRaisesRegex(ValueError,'DRAFT_ONLY'):m.compile_packages(self.items,self.sources)
 def test_reject_incorrect_total(self):
  self.items[0]['criteria'][0]['points']=2
  with self.assertRaisesRegex(ValueError,'OFFICIAL_TOTAL_MISMATCH'):m.compile_packages(self.items,self.sources)
 def test_no_legacy_q1(self):
  self.items[0]['question_id']='cea40cf3-dc05-507a-a6eb-fd5e1e1847bb'
  with self.assertRaisesRegex(ValueError,'EXACT_SIX_REQUIRED'):m.compile_packages(self.items,self.sources)
if __name__=='__main__':unittest.main()
