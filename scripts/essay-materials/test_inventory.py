import io, tempfile, unittest, zipfile
from pathlib import Path
from unittest.mock import patch
from pypdf import PdfWriter
from inventory import classify, normalized_name, run
class InventoryTests(unittest.TestCase):
 def test_unicode_recovery_preserves_raw(self):
  n='성균관대/2025학년도 논술.pdf'; i=zipfile.ZipInfo(n.encode().decode('cp437'));raw=i.filename
  self.assertEqual(normalized_name(i)[0],n);self.assertEqual(i.filename,raw)
 def test_year_and_type_ambiguity_stays_missing(self):
  self.assertIsNone(classify('2025학년도 수시 모의.pdf')['exam_type'])
  self.assertIsNone(classify('2024학년도 2025학년도.pdf')['academic_year'])
  self.assertFalse(classify('2000학년도 수시.pdf')['in_scope'])
  self.assertIsNone(classify('논술.pdf')['in_scope'])
 def test_actual_labels_are_not_collapsed(self):
  a=classify('2025학년도 수시_인문1(오후2) 문제.pdf');b=classify('2025학년도 모의_인문2 문제.pdf')
  self.assertEqual(a['track_raw'],'인문1(오후2)');self.assertEqual(a['session_raw'],['오후2'])
  self.assertNotEqual(a['exam_type'],b['exam_type']);self.assertNotEqual(a['track_raw'],b['track_raw'])
 def test_binary_duplicate_is_not_exam_merge_and_no_path_extraction(self):
  import json
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);source=root/'input';source.mkdir();out=root/'private'
   pdf=io.BytesIO();w=PdfWriter();w.add_blank_page(100,100);w.write(pdf)
   for name in ['중앙대.zip','연세대2.zip','추가자료.zip']:
    with zipfile.ZipFile(source/name,'w') as z:
     z.writestr('../../2025학년도 수시_인문.pdf',pdf.getvalue());z.writestr('__MACOSX/._x.pdf',b'not a pdf')
   before={p.name:p.read_bytes() for p in source.iterdir()}
   with patch('builtins.print'):run(source,out)
   s=json.loads((out/'summary.json').read_text());rows=json.loads((out/'inventory.json').read_text())
   self.assertEqual((s['total_pdfs'],s['unique_pdfs'],s['duplicate_occurrences']),(3,1,2))
   self.assertTrue(all(r['exam_id'] is None and not r['evaluation_allowed'] for r in rows))
   self.assertEqual(before,{p.name:p.read_bytes() for p in source.iterdir()})
   self.assertFalse((root/'2025학년도 수시_인문.pdf').exists())
 def test_output_cannot_modify_source_folder(self):
  with tempfile.TemporaryDirectory() as t:
   with self.assertRaises(ValueError):run(Path(t),Path(t)/'output')
if __name__=='__main__':unittest.main()
