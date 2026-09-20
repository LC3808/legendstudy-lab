import type { Metadata } from "next";

import { LabLanding } from "@/components/lab-landing";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy LAB | 레전드스터디+ 논술 서비스",
  "대학별 논술 정보와 기출 분석, 답안 작성과 첨삭까지. 레전드스터디+ LegendStudy LAB이 준비하는 논술 학습 흐름을 안내합니다.",
  "/",
);

export default function RootPage() {
  return <LabLanding />;
}
