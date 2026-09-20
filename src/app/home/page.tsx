import Link from "next/link";

import { buildPublicMetadata } from "@/lib/brand";
import { authenticatedProductRoutes } from "@/lib/release-routes";

export const metadata = buildPublicMetadata(
  "홈",
  "LegendStudy Account로 로그인한 뒤 이동하는 LegendStudy LAB 홈입니다. 준비된 학습 영역으로 이동할 수 있습니다.",
  "/home/",
  { index: false },
);

const cards = [
  { href: "/score-analysis/", title: "성적 분석", body: "성적·학습 기록 기반 분석 영역의 준비 상태를 확인합니다." },
  { href: "/essay-lab/", title: "논술 LAB", body: "대학별 논술 자료와 향후 AI 첨삭 흐름을 살펴봅니다." },
  { href: "/my/essays/", title: "내 기록", body: "같은 계정에 귀속될 개인 논술·학습 기록 영역입니다." },
  { href: "/account/", title: "마이페이지", body: "계정 상태와 연결 정보를 확인합니다." },
] as const;

export default function HomePage() {
  return (
    <div className="placeholder-page content-wrap">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / HOME</p>
      <h1>학습 흐름을<br />여기에서 이어가세요.</h1>
      <p>LegendStudy+와 LAB은 같은 LegendStudy Account로 연결됩니다. 준비된 영역부터 안내하며, 아직 개인 학습 데이터를 저장하거나 분석 결과를 제공하지 않습니다.</p>
      <nav className="home-entry-grid" aria-label="학습 영역 바로가기">
        {cards.map((card) => (
          <Link className="home-entry-card" key={card.href} href={card.href}>
            <strong>{card.title}</strong>
            <span>{card.body}</span>
          </Link>
        ))}
      </nav>
      <small>
        메뉴: {authenticatedProductRoutes.map((route) => route.label).join(" · ")}. 실제 개인 데이터 연동은 아직 구현되지 않았습니다.
      </small>
    </div>
  );
}
