import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "개인정보처리방침 초안 상태",
  "LegendStudy+ 및 LS LAB의 개인정보처리방침 발행 전 검토 항목을 안내합니다.",
  "/privacy",
  { index: false },
);

export default function PrivacyPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY+ / PRIVACY</p>
      <div className="policy-page__heading"><h1>개인정보처리방침<br />발행 준비 상태</h1><ReleaseStatusLabel status="OWNER_REVIEW_REQUIRED" /></div>
      <p className="policy-page__lead">이 페이지는 LegendStudy+와 LS LAB이 사용할 정책 URL 구조와 검토 범위를 안내하는 초안입니다. 아직 공식 개인정보처리방침으로 발행되지 않았으며, Store-ready 문서가 아닙니다.</p>
      <section className="policy-section"><h2>발행 전 확정해야 할 항목</h2><ul className="policy-list"><li>계정, 이메일, 프로필, 학년·학교 설정, 저장 자료, 최근 본 자료, 학습·시험 기록, 향후 LS LAB 답안과 피드백의 실제 수집 여부</li><li>각 정보의 목적, 법적 근거, 필수·선택 구분, 보유 기간, 삭제·정정·열람 방법</li><li>미성년자 및 만 14세 미만 이용자의 처리 기준과 법정대리인 동의 절차</li><li>분석·클라우드·AI·고객지원 제공자와의 처리 위탁, 국외 이전, 접근권한, 보안 조치</li><li>서비스 문의와 개인정보 보호책임자 연락처, 변경 공지 절차</li></ul></section>
      <section className="policy-section"><h2>현재 LS LAB의 데이터 상태</h2><p>이 웹 foundation은 실제 계정·결제·학생 답안·AI 평가를 운영하지 않습니다. 기존 Foundation 화면에는 합성 예시와 브라우저 로컬 임시 초안 UX가 있으며, 이는 사용자 계정 저장이나 서버 동기화 기능이 아닙니다.</p></section>
      <ReleaseNotice><strong>발행 금지 상태.</strong> 데이터 처리 범위, 책임자, 문의 경로, 보유·삭제 정책, 외부 처리자 계약이 Owner와 법률·개인정보 검토를 통과하기 전에는 이 페이지를 Published로 표시하거나 앱 Store 메타데이터 URL로 사용하지 않습니다.</ReleaseNotice>
      <div className="policy-actions"><Link className="button button--outline" href="/terms">이용약관 상태 보기</Link><Link className="button button--primary" href="/support">지원 상태 보기</Link></div>
    </div>
  );
}
