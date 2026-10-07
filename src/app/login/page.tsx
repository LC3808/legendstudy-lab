import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-forms";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "로그인",
  "하나의 계정으로 모든 서비스를 이용하세요.",
  "/login/",
  { index: false },
);

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
