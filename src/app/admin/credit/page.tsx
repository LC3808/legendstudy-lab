import type { Metadata } from "next";

import { AdminCreditView } from "@/components/admin/admin-credit-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "Credit | 운영 콘솔",
  description: "LegendStudy 운영 콘솔 Credit 조회입니다.",
  robots: { index: false, follow: false },
};

export default function AdminCreditPage() {
  return (
    <AdminSurface
      active="credit"
      eyebrow="LEGENDSTUDY / OPERATIONS / CREDIT"
      title="Credit 관리"
      lead="Credit 잔액과 지급·거래 내역을 조회합니다. 이번 단계는 조회 전용이며 지급 기능은 열려 있지 않습니다."
    >
      <AdminCreditView />
    </AdminSurface>
  );
}
