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
      lead="회원별 Credit 잔액과 거래 내역을 확인하고 운영 Credit을 지급합니다."
    >
      <AdminCreditView />
    </AdminSurface>
  );
}
