import Link from "next/link";
import { CreditBalance } from '@/components/credit-balance';
import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-control";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "마이페이지",
  "LegendStudy LAB의 개인 서비스 허브입니다. 성적 분석, 논술 LAB, 내 기록과 계정·설정을 한 곳에서 확인합니다.",
  "/account/",
  { index: false },
);

/**
 * MY is the signed-in member's personal service hub. The service landing owns
 * "/" for every visitor, so the member area keeps only the personal functions:
 * the three analysis entries and the account/settings block below them.
 */
const entries = [
  { href: "/score-analysis/", title: "성적 분석", body: "성적·학습 기록 기반 분석 영역입니다." },
  { href: "/essay-lab/", title: "논술 LAB", body: "대학별 논술 자료와 첨삭 흐름을 확인합니다." },
  { href: "/my/essays/", title: "내 기록", body: "내 계정에 귀속된 논술·학습 기록입니다." },
] as const;

export default function AccountPage() {
  return (
    <div className="content-wrap content-wrap--detail my-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / MY</p>
      <div className="policy-page__heading">
        <h1>마이페이지</h1>
      </div>
      <p className="policy-page__lead">내 학습 영역과 계정 상태를 한 곳에서 확인합니다.</p>
      <nav className="home-entry-grid" aria-label="개인 학습 영역 바로가기">
        {entries.map((entry) => (
          <Link className="home-entry-card" key={entry.href} href={entry.href}>
            <strong>{entry.title}</strong>
            <span>{entry.body}</span>
          </Link>
        ))}
      </nav>
      <section className="policy-section" aria-labelledby="my-account-title">
        <h2 id="my-account-title">계정과 설정</h2>
        <AccountPanel />
        <CreditBalance />
      </section>
    </div>
  );
}
