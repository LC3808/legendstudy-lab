import type { Metadata } from "next";

import { AdminPaymentView } from "@/components/admin/admin-payment-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "결제 조회",
  description: "LegendStudy 운영 콘솔 결제 조회.",
  robots: { index: false, follow: false },
};

export default function AdminPaymentPage() {
  return (
    <AdminSurface
      active="payment"
      eyebrow="운영 콘솔"
      title="결제 조회"
      lead="주문 내역을 조회합니다. 이 화면은 조회 전용이며 취소·환불 권한은 없습니다."
    >
      <AdminPaymentView />
    </AdminSurface>
  );
}
