import type { Metadata } from "next";

import { AdminMembersView } from "@/components/admin/admin-members-view";
import { AdminSurface } from "@/components/admin/admin-surface";

export const metadata: Metadata = {
  title: "회원 | 운영 콘솔",
  description: "LegendStudy 운영 콘솔 회원 조회입니다.",
  robots: { index: false, follow: false },
};

export default function AdminMembersPage() {
  return (
    <AdminSurface
      active="members"
      eyebrow="LEGENDSTUDY / OPERATIONS / MEMBERS"
      title="회원 관리"
      lead="회원을 검색하고 학교·학년·계정 상태별로 확인하세요."
    >
      <AdminMembersView />
    </AdminSurface>
  );
}
