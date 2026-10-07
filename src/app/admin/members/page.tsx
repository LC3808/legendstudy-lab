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
      lead="이메일 또는 계정 ID로만 조회합니다. 답안 본문은 운영 콘솔 기본 화면에 표시하지 않습니다."
    >
      <AdminMembersView />
    </AdminSurface>
  );
}
