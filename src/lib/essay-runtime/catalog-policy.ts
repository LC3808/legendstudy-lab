/** Owner decision 2026-10-11. Source IDs only, not a second university catalog.
 * Development groups NEVER select a question evaluator or prove readiness. */
export const priorityUniversityIds = ['gachon','cau','skku','kyunghee','hanyang','hufs','korea','kookmin','konkuk','sogang','ewha','soongsil','inha','dongguk','sejong','yonsei','hongik','ajou','syu','knu','kyonggi','pnu'] as const;
export const groupAUniversityIds = ['gachon','syu','knu','pnu'] as const;
export const preparationUniversityIds = ['gachon','catholic','konkuk','kyonggi','knu','kyunghee','kwangwoon','dankook','dongguk','pnu','sangmyung','sogang','seokyeong','seoultech','uos','swu','skku','sungshin','sejong','sookmyung','soongsil','ajou','yonsei','ewha','inha','cau','hufs','kau','hanyang','hongik'] as const;
export function isPriorityUniversity(id:string){return (priorityUniversityIds as readonly string[]).includes(id);}
