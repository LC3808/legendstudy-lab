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
      lead="실제 데이터베이스에 기록된 값만 표시합니다. 설치되지 않은 기능은 0이 아니라 미설치로 표시합니다."
    >
      <AdminDashboardView />
    </AdminSurface>
  );
}
