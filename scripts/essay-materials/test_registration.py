"""Registration planning invariants; no DB connection or Provider call."""
import copy,json,unittest
from pathlib import Path
from prepare_registration import prepare,sql_document
ROOT=Path(__file__).resolve().parents[2]
class RegistrationTests(unittest.TestCase):
 def setUp(self):
  self.registry=json.loads((ROOT/'src/data/essay-source-registry.json').read_text())
  self.db=json.loads(Path(__file__).with_name('db-catalog-preflight-20261012.json').read_text())
 def test_preserve_all_77_with_explicit_reconciliation(self):
  p=prepare(self.registry,self.db)
  self.assertEqual(len(p['exams'])+len(p['held']),77)
  self.assertEqual(len(p['held']),1)
  self.assertEqual(sum(e['existingExam'] for e in p['exams']),2)
  self.assertEqual(sum(len(e['questions']) for e in p['exams']),234)
  self.assertEqual(len({q['id'] for e in p['exams'] for q in e['questions']}),234)
  self.assertEqual(p,prepare(copy.deepcopy(self.registry),self.db))
  self.assertFalse(p['evaluation']);self.assertFalse(p['publication'])
 def test_no_silent_existing_id_remap_or_unknown_university(self):
  r=copy.deepcopy(self.registry);e=next(e for e in r['exams'] if e['dbExamId']);e['year']-=1
  with self.assertRaises(ValueError):prepare(r,self.db)
  r=copy.deepcopy(self.registry);r['exams'][0]['universityId']='unknown'
  self.assertEqual(prepare(r,self.db)['held'][0]['reason'],'UNVERIFIED_OR_UNKNOWN_UNIVERSITY')
 def test_sql_delimiters_rejected(self):
  p=prepare(self.registry,self.db);p['exams'][0]['name']='$body$; drop table x;'
  with self.assertRaises(ValueError):sql_document(p)
if __name__=='__main__':unittest.main()
