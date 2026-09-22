import type { Metadata } from "next";
import { KakaoCallback } from "@/components/kakao-callback";
export const metadata: Metadata = { title: "Kakao 로그인 확인", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function KakaoCallbackPage() { return <KakaoCallback />; }
