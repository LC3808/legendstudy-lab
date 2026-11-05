import unittest
from task20_split_sookmyung_criteria import split_criteria

class CriteriaBoundaryTests(unittest.TestCase):
    def pages(self):
        blocks=['■ 각 세부 문제별로\n① <'+str(n)+'-1> 기준\n② <'+str(n)+'-2> 기준\n'+ '\n'.join(str(x)+'등급' for x in range(1,10)) for n in range(1,4)]
        return ['6. 채점 기준\n'+blocks[0]+blocks[1][:30],blocks[1][30:]+blocks[2]+'\n7. 예시 답안\n최종 정답']
    def test_cross_page_keeps_all_bands_without_answer(self):
        units=split_criteria(self.pages());self.assertEqual(len(units),3)
        self.assertEqual((units[1]['first_page'],units[1]['last_page']),(1,2))
        self.assertNotIn('최종 정답',str(units));self.assertTrue(all(x['verification']=='NEEDS_REVIEW' for x in units))
    def test_other_question_criteria_rejected(self):
        p=self.pages();p[0]=p[0].replace('<1-2>','<2-2>')
        with self.assertRaisesRegex(ValueError,'CROSS_QUESTION'):split_criteria(p)
    def test_missing_grade_continuation_rejected(self):
        p=self.pages();p[1]=p[1].replace('9등급','')
        with self.assertRaisesRegex(ValueError,'INCOMPLETE'):split_criteria(p)
    def test_missing_answer_boundary_rejected(self):
        with self.assertRaisesRegex(ValueError,'BOUNDARY'):split_criteria(['6. 채점 기준'])
if __name__=='__main__':unittest.main()
