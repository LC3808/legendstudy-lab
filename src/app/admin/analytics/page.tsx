import type { Metadata } from "next";
import { AdminSurface } from "@/components/admin/admin-surface";

import { AdminAnalytics } from "@/components/admin/admin-analytics";

export const metadata: Metadata = {
  title: "사용자 행동 분석",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
 return <AdminSurface active="analytics" eyebrow="논술 LAB 운영" title="통합 분석"><AdminAnalytics /></AdminSurface>;
}
