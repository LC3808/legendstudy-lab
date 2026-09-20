import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-forms";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy Account 비밀번호 재설정",
  "LegendStudy Account 비밀번호 재설정 이메일을 요청하는 화면입니다.",
  "/forgot-password/",
  { index: false },
);

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
