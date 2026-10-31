import { AdminSurface } from "@/components/admin/admin-surface";
import { AdminNotices } from "@/components/admin/admin-notices";
export const metadata = {
  title: "공지사항 관리",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <AdminSurface
      active="notices"
      eyebrow="운영 콘솔"
      title="공지사항 관리"
      lead="APP과 WEB 공지를 작성하고 게시 기간을 관리합니다."
    >
      <AdminNotices />
    </AdminSurface>
  );
}
