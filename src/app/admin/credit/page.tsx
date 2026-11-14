import Link from "next/link";
import type { Metadata } from "next";

import { AdminCreditView } from "@/components/admin/admin-credit-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "이용권 | 운영 콘솔",
  description: "LegendStudy 운영 콘솔 이용권 조회입니다.",
  robots: { index: false, follow: false },
};

export default function AdminCreditPage() {
  return (
    <AdminSurface
      active="credit"
      eyebrow="LEGENDSTUDY / OPERATIONS / CREDIT"
      title="이용권 관리"
      lead="회원별 이용권 잔액과 거래 내역을 확인하고 운영 이용권을 지급합니다."
    >
      <p><Link href="/admin/essay-runs/">전체 첨삭 요청·완료 및 품질 검수 후보 보기 →</Link></p><AdminCreditView />
    </AdminSurface>
  );
}
