"use client";

import { useEffect, useRef } from "react";
import { getBrowserAuthClient } from "@/lib/browser-auth-client";
import { consumeKakaoCallback, finishKakaoLogin, KAKAO_FAILURE_PATH } from "@/lib/kakao-oidc";

export function KakaoCallback() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = window.location.hash;
    window.history.replaceState(null, "", "/auth/kakao/");
    try {
      const transaction = consumeKakaoCallback(fragment);
      const client = getBrowserAuthClient();
      if (!client) throw new Error("failed");
      void finishKakaoLogin(client, transaction).then((path) => window.location.replace(path))
        .catch(() => window.location.replace(KAKAO_FAILURE_PATH));
    } catch (error) {
      window.location.replace(error instanceof Error && error.message === "cancelled" ? "/login/?kakao=cancelled" : KAKAO_FAILURE_PATH);
    }
  }, []);
  return <section className="auth-page content-wrap" aria-live="polite"><h1>로그인 확인 중</h1><p>잠시만 기다려 주세요.</p></section>;
}
