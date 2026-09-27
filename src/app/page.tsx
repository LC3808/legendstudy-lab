import type { Metadata } from "next";

import { LabLanding } from "@/components/lab-landing";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy LAB | 나의 입시 데이터가 쌓이는 곳",
  "내신·모의고사·수능·논술까지, 흩어진 입시 데이터를 연결해 지금의 위치를 이해하고 다음 선택을 명확하게 만듭니다. 레전드스터디+ LegendStudy LAB의 개인 입시 분석·학습 플랫폼을 안내합니다.",
  "/",
);

export default function RootPage() {
  return <LabLanding />;
}
