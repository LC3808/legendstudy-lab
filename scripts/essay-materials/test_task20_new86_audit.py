import unittest
from task20_new86_audit import anchors,inspect
class NewScopeAuditTests(unittest.TestCase):
 def test_parent_numbers_do_not_match_other_numbers(self):
  self.assertTrue(anchors('[문제\x002번]',2));self.assertFalse(anchors('[문제 12]',2));self.assertTrue(anchors('<문제 2-1>',2))
 def test_exam_question_drift_fails(self):
  with self.assertRaisesRegex(ValueError,'QUESTION_ID_DRIFT'):inspect({'examId':'a','questions':[{'id':'q'}]},{'exam_id':'a','questions':[]},{})
 def test_source_presence_never_promotes_review(self):
  e={'examId':'a','questions':[{'id':'q','label':'문제 1'}],'sourceHashes':['s'],'name':'exam','universityId':'u','year':2026,'track':'자연'}
  live={'exam_id':'a','questions':[{'id':'q','published':False,'math_leaf_count':0}],'package_digest':None,'runtime_policy':None,'review_state':None,'resource_links':0,'is_active':False}
  d={'s':{'name':'official.pdf','pages':['[문제 1] 채점기준 예시답안 [문제 2]'],'hash_verified':True}}
  r=inspect(e,live,d);self.assertFalse(r['public_candidate']);self.assertFalse(r['questions'][0]['review_complete']);self.assertTrue(r['questions'][0]['source_page_candidates'][0]['contains_other_question_anchors'])
if __name__=='__main__':unittest.main()
