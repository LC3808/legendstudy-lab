import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-forms";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy Account 새 비밀번호 설정",
  "이메일에서 시작한 LegendStudy Account 비밀번호 재설정을 완료하는 화면입니다.",
  "/reset-password/",
  { index: false },
);

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" />;
}
