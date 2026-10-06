import type { Metadata } from "next";

import { AdminOperationsView } from "@/components/admin/admin-operations-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "논술·수리 운영",
  description: "LegendStudy 운영 콘솔 논술·수리 운영 조회.",
  robots: { index: false, follow: false },
};

export default function AdminOperationsPage() {
  return (
    <AdminSurface
      active="essay"
      eyebrow="운영 콘솔"
      title="논술·수리 운영"
      lead="평가 파이프라인의 처리 상태와 품질 검토 여부를 조회합니다. 이 화면은 조회 전용이며 답안 원문은 열람할 수 없습니다."
    >
      <AdminOperationsView />
    </AdminSurface>
  );
}