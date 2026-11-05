import copy,unittest
import task20_sookmyung_packages as m
class PackageTests(unittest.TestCase):
 def fixture(self):
  return dict(slug='sookmyung-general',n=2,question_id=m.TARGETS[2],points=None,statement='Synthetic problem',criteria=[[None,'Synthetic official bands, no numeric points']],steps=['Synthetic reference'],question_pages=[2],scoring_pages=[8,9],solution_pages=[11,12,13],intent_pages=[7],source_review='VISUAL_CHECKED',provider_allowed=False,publication_allowed=False)
 def test_no_points_and_draft(self):
  p=m.build(self.fixture());self.assertEqual(p['state'],'DRAFT');self.assertIsNone(p['existing_schema_rows']['math_scoring_criteria'][0]['official_points']);self.assertFalse(p['publication_allowed'])
 def test_page13_required(self):
  q=self.fixture();q['solution_pages']=[11,12]
  with self.assertRaisesRegex(AssertionError,'BOUNDARY'):m.build(q)
 def test_numeric_grade_conversion_rejected(self):
  q=self.fixture();q.update(points=100,criteria=[[100,'Synthetic']])
  with self.assertRaisesRegex(AssertionError,'POINTS'):m.build(q)
 def test_registry_identity_guard(self):
  q=self.fixture();q['question_id']=m.TARGETS[1]
  with self.assertRaisesRegex(AssertionError,'REGISTRY'):m.build(q)
 def test_unresolved_glyph_rejected(self):
  q=self.fixture();q['statement']='\ue001'
  with self.assertRaisesRegex(AssertionError,'GLYPH'):m.build(q)
 def test_registration_never_overwrites_and_checks_duplicate_binding(self):
  s=m.registration_sql([m.build(self.fixture())]);self.assertIn('TASK20_QUESTION_ALREADY_BOUND',s);self.assertIn('TASK20_CONTENT_DRIFT',s);self.assertNotIn('update public.',s.lower());self.assertNotIn('delete from',s.lower())
if __name__=='__main__':unittest.main()
