import type { Metadata } from "next";
import { AdminSurface } from "@/components/admin/admin-surface";

import { AdminFinanceHub } from "@/components/admin/admin-learning-hub";

export const metadata: Metadata = {
  title: "이용권·매출·비용",
  robots: { index: false, follow: false },
};

export default function AdminFinanceHubPage() {
 return <AdminSurface active="analytics" eyebrow="논술 LAB 운영" title="이용권·매출·비용"><AdminFinanceHub /></AdminSurface>;
}
