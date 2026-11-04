import type { Metadata } from "next";

import { AdminDashboardView } from "@/components/admin/admin-dashboard-view";
import { AdminSurface } from "@/components/admin/admin-surface";

/**
 * Operations console — dashboard.
 *
 * Internal surface: `noindex`, absent from the sitemap, disallowed in
 * robots.txt and never linked from the public site. Authorization is enforced by
 * the database (`admin_operator()`), not by the route being hard to find.
 */
export const metadata: Metadata = {
  title: "운영 콘솔",
  description: "LegendStudy 운영 콘솔입니다.",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return (
    <AdminSurface
      active="dashboard"
      eyebrow="LEGENDSTUDY / OPERATIONS"
      title="운영 대시보드"
      lead="회원 구성과 공부·입시 기록을 먼저 확인하고, 필요한 운영 내역으로 이동하세요."
    >
      <AdminDashboardView />
    </AdminSurface>
  );
}
