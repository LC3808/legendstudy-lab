import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "지원 안내",
  "LegendStudy+ 및 LS LAB의 공식 지원 경로 발행 준비 상태를 안내합니다.",
  "/support",
  { index: false },
);

export default function SupportPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY+ / SUPPORT</p>
      <div className="policy-page__heading"><h1>지원 채널<br />발행 준비 상태</h1><ReleaseStatusLabel status="OWNER_REVIEW_REQUIRED" /></div>
      <p className="policy-page__lead">이 페이지는 LegendStudy+와 LS LAB이 사용할 공식 지원 URL의 기반입니다. 현재 운영 중인 이메일, 상담 폼, 처리 시간, 문의번호는 연결되어 있지 않습니다.</p>
      <section className="policy-section"><h2>출시 전 지원 운영에 필요한 정보</h2><ul className="policy-list"><li>공식 지원 이메일 또는 티켓 시스템과 담당 운영 주체</li><li>앱 오류, 계정, 개인정보, 결제, 콘텐츠 출처, 계정 삭제 요청의 문의 분류</li><li>접수 확인, 본인 확인, 처리 기한, 이의제기, 장애 공지 절차</li><li>미성년자·보호자 문의와 민감한 학습 기록을 다루는 확인 절차</li></ul></section>
      <section className="policy-section"><h2>현재 안내</h2><p>LS LAB은 서비스 준비 단계입니다. 실제 상담·계정 지원·결제 지원이 시작되기 전에는 이 페이지를 공식 고객센터 또는 Store 지원 URL로 확정해서는 안 됩니다.</p></section>
      <ReleaseNotice><strong>연락처 미연결.</strong> 임의의 지원 이메일이나 폼을 만들지 않았습니다. Owner가 관리 가능한 실제 문의 채널과 개인정보 처리 주체를 확정한 뒤에만 공식 연락처를 발행합니다.</ReleaseNotice>
      <div className="policy-actions"><Link className="button button--outline" href="/account-deletion">계정 삭제 안내 보기</Link><Link className="button button--primary" href="/lab">LS LAB 소개로 돌아가기</Link></div>
    </div>
  );
}
