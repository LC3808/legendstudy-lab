export type NavEntry = { key: string; label: string; href: string | null };

/**
 * Every entry is now navigable. The `/ql` Quality Console is reached from here
 * rather than reimplemented: it keeps its own authorization and its own route.
 */
const EXISTING_NAV: readonly NavEntry[] = [
  {key:"essay-runs",label:"첨삭 요청·결과",href:"/admin/essay-runs/"},
  { key: "material-sync", label: "학습자료 동기화", href: "/admin/material-sync/" },
  { key: "dashboard", label: "대시보드", href: "/admin/" },
  { key: "members", label: "회원", href: "/admin/members/" },
  { key: "credit", label: "이용권", href: "/admin/credit/" },
  { key: "payment", label: "결제", href: "/admin/payment/" },
  { key: "analytics", label: "이용권·매출·비용", href: "/admin/analytics/" },
  { key: "essay", label: "평가·비용 모니터링", href: "/admin/operations/" },
  { key: "beta", label: "베타 테스트 관리", href: "/admin/beta/" },
  { key: "beta-usage", label: "베타 이용 현황", href: "/admin/beta/usage/" },
  { key: "beta-failures", label: "평가 실패·복구 내역", href: "/admin/beta/failures/" },
  { key: "essay-feedback", label: "피드백·오류 신고", href: "/admin/essay-feedback/" },
  { key: "notices", label: "공지사항 관리", href: "/admin/notices/" },
  { key: "inquiries", label: "1:1 문의", href: "/admin/inquiries/" },
  // The quality console is the existing /ql surface, imported unchanged. Its
  // own authorization (quality_operators) is what guards it; this link grants
  // nothing and the two roles are deliberately not merged.
  { key: "quality", label: "평가 품질 관리", href: "/ql/" },
  { key: "materials", label: "논술 자료 검수", href: "/admin/materials/" },
] as const;

export const ADMIN_GROUPS = [
 {title:'운영 대시보드',keys:['dashboard','notices']},
 {title:'회원·이용권',keys:['members','credit','payment']},
 {title:'첨삭 운영',keys:['essay-runs','essay','beta','beta-usage','beta-failures']},
 {title:'첨삭 품질',keys:['quality','materials']},
 {title:'학생 피드백',keys:['essay-feedback','satisfaction','inquiries']},
 {title:'학습·입시 분석',keys:['learning','study','applications','students','essay-usage']},
 {title:'매출·비용·안정성',keys:['analytics','visitors','verification','material-sync']},
] as const;
const EXTRA_NAV = [
 ['overview','통합 분석 대시보드'],['visitors','방문자·유입 분석'],['conversion','가입·전환 분석'],['installs','앱 설치 유입 분석'],
 ['learning','학습·입시 종합 현황'],['universities','대학 선호도 분석'],['materials-data','인기 시험·학습자료 분석'],['study','공부 시간 분석'],['scores','성적·학습 분석'],['applications','입시 지원 분석'],['students','학생 통합 분석 (Student 360)'],['insights','개인화 인사이트 관리'],
 ['essay-usage','논술 학습 분석'],['samples','사용자 답안 샘플 검수'],['satisfaction','만족도·피드백 분석'],['verification','베타 검증 결과'],
] as const;
export const ADMIN_NAV = [...EXISTING_NAV,...EXTRA_NAV.map(([key,label])=>({key,label,href:`/admin/data/${key}/`}))];

