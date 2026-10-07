import type { Metadata } from "next";

import { AdminInquiriesView } from "@/components/admin/admin-inquiries-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "1:1 문의",
  description: "LegendStudy 운영 콘솔 1:1 문의 처리.",
  robots: { index: false, follow: false },
};

export default function AdminInquiriesPage() {
  return (
    <AdminSurface
      active="inquiries"
      eyebrow="운영 콘솔"
      title="1:1 문의"
      lead="회원 문의를 확인하고 답변합니다. 답변이 등록되면 회원에게 알림이 발송됩니다."
    >
      <AdminInquiriesView />
    </AdminSurface>
  );
}
