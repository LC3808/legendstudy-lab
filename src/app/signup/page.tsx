import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-forms";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy Account 회원가입",
  "LegendStudy+와 LegendStudy LAB에서 함께 사용하는 계정을 만드는 화면입니다.",
  "/signup/",
  { index: false },
);

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
