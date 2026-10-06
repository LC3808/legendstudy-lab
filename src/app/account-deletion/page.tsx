import Link from "next/link";
import { AccountDeletionRequest } from "@/components/account-deletion-request";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata("레전드스터디+ 계정 삭제", "LegendStudy Plus 계정 삭제 방법과 처리 범위 안내", "/account-deletion", { index: false });
export default function AccountDeletionPage() {
  return <div className="policy-page content-wrap content-wrap--detail">
    <h1>레전드스터디+ 계정 삭제</h1>
    <section className="policy-section"><h2>앱에서 요청</h2><p>MY → 설정 → 탈퇴 요청에서 안내를 확인합니다. 운영 활성화 전에는 준비 중으로 표시되며 삭제 요청이 접수되지 않습니다.</p></section>
    <section className="policy-section"><h2>웹에서 요청</h2><AccountDeletionRequest /></section>
    <section className="policy-section"><h2>삭제와 보존 범위</h2><p>계정·프로필·학교·학년·D-Day·저장 및 최근 본 자료·학습·시험 기록·아바타·논술 답안과 평가 등 계정에 연결된 개인 데이터를 삭제 대상으로 합니다. 기기의 로컬 기록은 앱에서 별도로 정리합니다.</p><p>삭제 요청에는 14일(336시간)의 유예기간이 있습니다. 완료된 삭제의 운영 확인 기록은 완료 후 30일 동안 보관하도록 설계되어 있습니다. 법령에 따른 거래 기록, 운영 기록 및 백업의 구체적인 보존기간은 운영 정책 확정이 필요한 항목이며, 확정 전에는 이 페이지의 삭제 요청 기능을 활성화하지 않습니다.</p></section>
    <div className="policy-actions"><Link href="/privacy/">개인정보처리방침</Link><Link href="/support/">고객센터</Link></div>
  </div>;
}
