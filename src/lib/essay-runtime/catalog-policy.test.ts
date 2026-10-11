import {it,expect} from 'vitest';
import {priorityUniversityIds,preparationUniversityIds,groupAUniversityIds} from './catalog-policy';
import {catalogUniversity,isFeaturedUniversity,publicCatalog} from './public-discovery';
it('preserves the exact Owner 22 and 30 preparation cohorts without using groups as evaluation types',()=>{
 expect(priorityUniversityIds.map(id=>catalogUniversity(id)?.name)).toEqual(['가천대학교','중앙대학교','성균관대학교','경희대학교','한양대학교','한국외국어대학교','고려대학교','국민대학교','건국대학교','서강대학교','이화여자대학교','숭실대학교','인하대학교','동국대학교','세종대학교','연세대학교','홍익대학교','아주대학교','삼육대학교','경북대학교','경기대학교','부산대학교']);
 expect(new Set(preparationUniversityIds).size).toBe(30);expect(preparationUniversityIds.every(id=>catalogUniversity(id))).toBe(true);
 expect(groupAUniversityIds).toEqual(['gachon','syu','knu','pnu']);expect(priorityUniversityIds.filter(id=>!(groupAUniversityIds as readonly string[]).includes(id))).toHaveLength(18);
 expect(catalogUniversity('pnu')!.offerings[0].types).not.toContain('단답·약술형');
 expect(publicCatalog.universities).toHaveLength(42);expect(catalogUniversity('kangnam')).toBeDefined();expect(catalogUniversity('eulji')).toBeDefined();
});
it('adds Seoul to preferred discovery without pretending unknown applicants meet 8000',()=>{
 expect(isFeaturedUniversity(catalogUniversity('sookmyung')!)).toBe(true);
 expect(priorityUniversityIds.every(id=>isFeaturedUniversity(catalogUniversity(id)!))).toBe(true);
 expect(isFeaturedUniversity(catalogUniversity('eulji')!)).toBe(false);
});
