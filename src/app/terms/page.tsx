import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "이용약관 초안 상태",
  "LegendStudy+ 및 LS LAB 이용약관 발행 전 검토 항목을 안내합니다.",
  "/terms",
  { index: false },
);

export default function TermsPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY+ / TERMS</p>
      <div className="policy-page__heading"><h1>이용약관<br />발행 준비 상태</h1><ReleaseStatusLabel status="OWNER_REVIEW_REQUIRED" /></div>
      <p className="policy-page__lead">이 페이지는 이용약관의 웹 경로와 필요한 검토 주제를 안내하는 초안입니다. 현재 서비스 이용계약, 결제, 구독, credit, AI 첨삭을 제공하거나 해당 조건을 확정하지 않습니다.</p>
      <section className="policy-section"><h2>발행 전 검토 범위</h2><ul className="policy-list"><li>서비스 제공 주체, 적용 서비스, 이용 연령, 계정 생성과 접근 통제</li><li>공식 외부 출처와 사용자 작성물의 구분, 지식재산권, 금지 행위, 출처 표시</li><li>AI 보조 기능의 성격, 결과의 한계, 오류 신고, 사람 검토와 이의제기 기준</li><li>결제·구독·credit이 실제 도입될 때의 가격 표시, 자동 갱신, 해지, 환불, 영수증</li><li>서비스 변경·중단, 분쟁 해결, 연락처, 약관 변경 공지</li></ul></section>
      <section className="policy-section"><h2>콘텐츠와 출처의 현재 원칙</h2><p>대학·기관의 공개 페이지 또는 파일 URL은 원문 출처로 이동하기 위한 정보일 수 있으나, LS LAB의 복제·저장·재배포·AI 처리 권한을 뜻하지 않습니다. 권리와 이용 범위가 확인되지 않은 공식 문제·지문·해설·채점 기준은 서비스 자산으로 취급하지 않습니다.</p></section>
      <ReleaseNotice><strong>법률 문서 아님.</strong> 이 페이지의 내용은 법률 자문이나 확정 약관이 아닙니다. 실제 기능, 결제, 사용자 데이터, 콘텐츠 이용 범위가 확정된 뒤 Owner 검토와 법률 검토를 거쳐 별도 Published 문서를 발행해야 합니다.</ReleaseNotice>
      <div className="policy-actions"><Link className="button button--outline" href="/privacy">개인정보처리방침 상태 보기</Link><Link className="button button--primary" href="/support">지원 상태 보기</Link></div>
    </div>
  );
}
