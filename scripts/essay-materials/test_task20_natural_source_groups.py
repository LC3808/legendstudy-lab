import unittest
from task20_natural_source_groups import identity, locators, build

class NaturalIdentityTests(unittest.TestCase):
    def test_mock_question_files_are_not_separate_exams(self):
        self.assertEqual(identity('kwangwoon','2025학년도 광운대 모의논술_자연(1번) 문제,답안.pdf'),identity('kwangwoon','2025학년도 광운대 모의논술_자연(2번) 문제,답안.pdf'))
    def test_admission_sessions_are_distinct(self):
        self.assertNotEqual(identity('kwangwoon','2022학년도 광운대 논술_자연(1교시) 문제.pdf'),identity('kwangwoon','2022학년도 광운대 논술_자연(2교시) 문제.pdf'))
    def test_chungang_modes_and_tracks_distinct(self):
        keys={identity('chungang',f'2027학년도 중앙대 모의논술_자연-{t}({m}) 문제.pdf') for t in ('공통','의약학') for m in ('일반','창의')}
        self.assertEqual(len(keys),4)
        self.assertTrue(identity('chungang','2027학년도 중앙대 모의논술_자연계열(창의) 해설,답안.pdf')[2].startswith('미배정'))
    def test_pdf_nul_and_optional_number_suffix(self):
        self.assertEqual(locators({'pages':['[문제\x001] 다음', '[문제 2번] 다음']})[1]['observed_question_labels'],[2])
    def test_existing_natural_alias_reuses_id(self):
        doc={'name':'2025학년도 중앙대 모의논술_자연 문제.pdf','sha256':'a'*64,'pages':['[문제 1]']}
        exam={'exam_id':'existing','admission_year':2025,'exam_kind':'mock','field_or_division':'자연','session_label':None,'questions':[]}
        self.assertEqual(build('chungang',[doc],[exam])[0]['existing_exam_ids'],['existing'])
    def test_no_original_text_or_automatic_approval(self):
        doc={'name':'2027학년도 한양대 모의논술_자연계열 문제.pdf','sha256':'a'*64,'pages':['[문제 1] 원문내용']}
        row=build('hanyang',[doc],[])[0]
        self.assertFalse(row['semantic_review_pass']);self.assertFalse(row['parent_count_verified'])
        self.assertNotIn('원문내용',str(row))

if __name__=='__main__':unittest.main()
