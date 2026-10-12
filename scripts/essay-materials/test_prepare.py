import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from prepare import prepare
class PreparationTests(unittest.TestCase):
 def test_reuse_requires_exact_manifest_source_identity(self):
  with tempfile.TemporaryDirectory() as t:
   r=Path(t);(r/'private-text').mkdir()
   for name,value in [('inventory.json',[]),('summary.json',{}),('catalog.json',{'universities':[{'name':'한국외국어대학교','sourceUniversityId':'hufs','universityId':'existing'}]}),('source.json',{'pdf_sha256':'a','university':{'id':'u'},'exam':{'id':'e','field_or_division':'인문','session_label':None}}),('manifest.json',{'pdf_sha256':'b','essay_exam_id':'e'})]:
    (r/name).write_text(json.dumps(value))
   with self.assertRaisesRegex(ValueError,'identity mismatch'):
    prepare(r,r/'catalog.json',r/'source.json',r/'manifest.json')
   manifest={'pdf_sha256':'a','essay_exam_id':'other'}
   (r/'manifest.json').write_text(json.dumps(manifest))
   with self.assertRaisesRegex(ValueError,'identity mismatch'):
    prepare(r,r/'catalog.json',r/'source.json',r/'manifest.json')
 def test_absent_source_never_counts_existing_package_as_ingested(self):
  with tempfile.TemporaryDirectory() as t:
   r=Path(t);(r/'private-text').mkdir()
   data={'inventory.json':[],'summary.json':{},'catalog.json':{'universities':[{'name':'한국외국어대학교','sourceUniversityId':'hufs','universityId':'u'}]},'source.json':{'pdf_sha256':'a','university':{'id':'u'},'exam':{'id':'e','field_or_division':'인문','session_label':None}},'manifest.json':{'pdf_sha256':'a','essay_exam_id':'e','evidence_package_version':'v1','package_sha256':'p','questions':['q1'],'locators':[]}}
   for name,value in data.items():(r/name).write_text(json.dumps(value))
   with patch('builtins.print'):prepare(r,r/'catalog.json',r/'source.json',r/'manifest.json')
   self.assertEqual(json.loads((r/'summary.json').read_text())['reused_existing_packages'],0)
   self.assertFalse(json.loads((r/'existing-skku-reconciliation.json').read_text())['runtime_activation'])
if __name__=='__main__':unittest.main()
