import unittest
from task20_recovery_inventory import inspect_question,sookmyung_identity,sookmyung_plan
class RecoveryInventoryTests(unittest.TestCase):
 def test_mock_question_files_share_identity(self):
  self.assertEqual(sookmyung_identity('2025학년도 숙명여대 모의논술_인문1 문제.pdf'),sookmyung_identity('2025학년도 숙명여대 모의논술_인문2 문제.pdf'))
 def test_admission_sessions_stay_separate(self):
  self.assertNotEqual(sookmyung_identity('2025학년도 숙명여대 수시 논술_인문1 문제.pdf'),sookmyung_identity('2025학년도 숙명여대 수시 논술_인문2 문제.pdf'))
 def test_generic_natural_and_pharmacy_stay_separate(self):
  self.assertNotEqual(sookmyung_identity('2026학년도 숙명여대 수시 논술_자연(일반) 문제.pdf'),sookmyung_identity('2026학년도 숙명여대 수시 논술_자연(약학부) 문제.pdf'))
 def inspect(self,**kwargs):
  refs=[dict(questionId='q',role=r,sourceHash='hash',startPage=1,endPage=1,evidenceText='original',verification='NEEDS_REVIEW',**kwargs) for r in ['question','intent','criteria']]
  return inspect_question({'id':'q','label':'Q1'},{'package':{'questions':[{'question_id':'q','source_page_references':refs}]}},{'hash':['original.pdf']})
 def test_text_presence_never_grants_semantic_pass(self):
  x=self.inspect();self.assertTrue(x['source_candidate_complete']);self.assertFalse(x['semantic_review_pass']);self.assertIn('SOURCE_REVIEW_PENDING',x['issues'])
 def test_missing_draft_remains_missing(self):
  x=inspect_question({'id':'q','label':'Q1'},None,{});self.assertEqual(x['missing_roles'],['criteria','intent','question'])
 def test_wrong_question_does_not_supply_evidence(self):
  d={'package':{'questions':[{'question_id':'other','source_page_references':[]}]}}
  self.assertFalse(inspect_question({'id':'q','label':'Q1'},d,{})['source_candidate_complete'])
 def test_existing_aggregate_is_reused(self):
  docs=[dict(name=f'2025학년도 숙명여대 모의논술_인문{i} 문제.pdf',sha256=str(i),pages=['x']) for i in [1,2]]
  exams=[dict(exam_id='existing',admission_year=2025,exam_kind='mock',field_or_division='인문계열',session_label=None,questions=[{'id':'kept'}])]
  plan=sookmyung_plan(docs,exams);self.assertEqual(len(plan),1);self.assertEqual(plan[0]['existing_exam_ids'],['existing']);self.assertEqual(plan[0]['existing_question_ids'],['kept']);self.assertFalse(plan[0]['public_activation'])
 def test_missing_registry_does_not_generate_ids(self):
  plan=sookmyung_plan([dict(name='2021학년도 숙명여대 논술_자연계 문제.pdf',sha256='hash',pages=['x'])],[])
  self.assertEqual(plan[0]['status'],'REGISTRY_MAPPING_REQUIRED');self.assertEqual(plan[0]['existing_exam_ids'],[]);self.assertIsNone(plan[0]['parent_question_count'])
if __name__=='__main__':unittest.main()
