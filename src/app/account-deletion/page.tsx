import Link from "next/link";

import { ReleaseNotice, ReleaseStatusLabel } from "@/components/release-status";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "계정 삭제 안내 초안 상태",
  "LegendStudy+ 계정 삭제 웹 경로의 현재 준비 상태와 발행 전 요구사항을 안내합니다.",
  "/account-deletion",
  { index: false },
);

export default function AccountDeletionPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY+ / ACCOUNT DELETION</p>
      <div className="policy-page__heading"><h1>계정 삭제 안내<br />준비 상태</h1><ReleaseStatusLabel status="FOUNDATION_ONLY" /></div>
      <p className="policy-page__lead">이 URL은 향후 Google Play와 사용자 지원에 필요한 계정 삭제 웹 경로를 준비하기 위한 기반입니다. 현재는 인증, 삭제 요청 접수, 데이터 삭제 API, 처리 완료 통지가 연결되어 있지 않습니다.</p>
      <section className="policy-section"><h2>현재 제공하지 않는 것</h2><p>이 페이지에서 계정을 즉시 삭제할 수 없으며, 삭제 요청이 접수되거나 처리되었다고 표시하지 않습니다. 로그인 토큰, 앱 세션, 사용자 ID, 학습 기록을 이 웹사이트로 전달하거나 저장하지 않습니다.</p></section>
      <section className="policy-section"><h2>실제 삭제 경로를 열기 전 확인할 항목</h2><ol className="process-list"><li><strong>본인 확인</strong><span>앱 계정·웹 계정의 연결 상태와 보안 수준에 맞는 인증 방식을 정해야 합니다.</span></li><li><strong>삭제 대상과 예외</strong><span>계정, 프로필, 저장 자료, 최근 본 자료, 학습 기록, 시험 기록, LS LAB 답안·피드백, 법정 보관 데이터의 범위를 명시해야 합니다.</span></li><li><strong>처리와 통지</strong><span>삭제 요청 접수, 철회 가능 기간, 완료 시점, 실패·이의제기, 지원 채널을 실제 운영 체계로 연결해야 합니다.</span></li></ol></section>
      <ReleaseNotice><strong>Store-ready 아님.</strong> 실제 계정 삭제 요청 또는 앱 내 삭제 방법이 운영되고, 공식 지원 채널과 개인정보처리방침이 Published 상태가 되기 전에는 이 페이지를 계정 삭제 요구사항의 완료 근거로 사용하지 않습니다.</ReleaseNotice>
      <div className="policy-actions"><Link className="button button--outline" href="/privacy">개인정보처리방침 상태 보기</Link><Link className="button button--primary" href="/support">지원 상태 보기</Link></div>
    </div>
  );
}
