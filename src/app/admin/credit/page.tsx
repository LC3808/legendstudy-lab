import type { Metadata } from "next";

import { AdminCreditView } from "@/components/admin/admin-credit-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "크레딧 | 운영 콘솔",
  description: "LegendStudy 운영 콘솔 크레딧 조회입니다.",
  robots: { index: false, follow: false },
};

export default function AdminCreditPage() {
  return (
    <AdminSurface
      active="credit"
      eyebrow="LEGENDSTUDY / OPERATIONS / CREDIT"
      title="크레딧 관리"
      lead="회원별 크레딧 잔액과 거래 내역을 확인하고 운영 크레딧을 지급합니다."
    >
      <AdminCreditView />
    </AdminSurface>
  );
}
