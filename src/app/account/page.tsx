import type { Metadata } from "next";

import { AccountPanel } from "@/components/account-control";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata: Metadata = buildPublicMetadata(
  "LegendStudy Account",
  "현재 LegendStudy Account 세션과 LAB의 계정 연결 상태를 확인하는 화면입니다.",
  "/account/",
  { index: false },
);

export default function AccountPage() {
  return <div className="auth-page content-wrap"><AccountPanel /></div>;
}
