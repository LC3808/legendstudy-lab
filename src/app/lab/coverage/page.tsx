import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "LS LAB 지원 범위",
  "LegendStudy+ LS LAB의 현재 공개 범위와 권리·운영 검토가 필요한 향후 기능을 구분합니다.",
  "/lab/coverage",
);

const rows = [
  ["서비스 소개와 이용 방법", "현재 공개", "LS LAB의 역할, 준비 단계, 지원 경로를 안내합니다."],
  ["대학별 공식 원문", "권리·출처 검토 필요", "공식 문제·해설·채점기준을 저장하거나 재배포하지 않습니다."],
  ["답안 작성과 이력", "기반 준비 중", "공유 계정, 보관, 삭제, 접근권한이 확정된 뒤에만 제공합니다."],
  ["AI 첨삭과 피드백", "운영 준비 중", "모델, 품질 기준, 비용, 이의제기, 개인정보 처리가 확정되어야 합니다."],
  ["결제·구독·credit", "미구현", "가격과 결제 수단을 표시하거나 결제를 받지 않습니다."],
] as const;

export default function CoveragePage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail">
      <p className="eyebrow eyebrow--accent">LS LAB / COVERAGE</p>
      <div className="policy-page__heading"><h1>준비 범위와<br />제한을 구분합니다.</h1><ReleaseStatusLabel status="FOUNDATION_ONLY" /></div>
      <p className="policy-page__lead">LS LAB은 정보의 출처와 서비스의 실제 상태를 분리합니다. 공개된 URL이 콘텐츠 복제·배포·AI 처리의 권한을 뜻하지 않으며, 미구현 기능을 실제 서비스처럼 표시하지 않습니다.</p>
      <section className="policy-section"><h2>현재 단계</h2><div className="scope-table" role="table" aria-label="LS LAB 서비스 상태"><div className="scope-table__head" role="row"><span role="columnheader">영역</span><span role="columnheader">상태</span><span role="columnheader">설명</span></div>{rows.map(([area, status, description]) => <div className="scope-table__row" role="row" key={area}><strong role="cell">{area}</strong><span role="cell">{status}</span><p role="cell">{description}</p></div>)}</div></section>
      <ReleaseNotice><strong>공식 자료 안내.</strong> 대학별 논술 관련 공식 페이지는 최종 지원 전 반드시 해당 대학 입학처에서 다시 확인해야 합니다. LS LAB은 권리 미확정 문제·지문·해설·채점 기준을 복제하거나 제공하지 않습니다.</ReleaseNotice>
      <div className="policy-actions"><Link className="button button--outline" href="/lab/how-it-works">이용 방법 보기</Link><Link className="button button--primary" href="/support">문의와 지원 안내</Link></div>
    </div>
  );
}
