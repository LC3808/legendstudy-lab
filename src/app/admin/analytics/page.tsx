import type { Metadata } from "next";
import { AdminPanel, AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "사용자 행동 분석",
  robots: { index: false, follow: false },
};

/** Existing v1 dashboard is native Flutter; do not invent a second dashboard. */
export default function AdminAnalyticsPage() {
  return <AdminSurface active="analytics" eyebrow="논술 LAB 운영" title="사용자 행동 분석">
    <AdminPanel tone="warning" title="WEB 분석 화면 연결이 필요합니다">
      <p>기존 Analytics v1 관리자 화면은 APP의 관리자 분석 메뉴에서 제공됩니다. WEB에는 아직 해당 화면이 연결되어 있지 않습니다.</p>
      <p>APP 경로: /my/admin/analytics</p>
      <p>실제 행동 이벤트 수신과 집계 연결을 확인하기 전에는 사용자 수나 전환율을 표시하지 않습니다.</p>
    </AdminPanel>
  </AdminSurface>;
}
