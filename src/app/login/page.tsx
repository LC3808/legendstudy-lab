import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-forms";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy Account 로그인",
  "LegendStudy+와 LegendStudy LAB에서 같은 계정으로 로그인하기 위한 LegendStudy Account 로그인 화면입니다.",
  "/login/",
  { index: false },
);

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
