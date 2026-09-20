"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth-context";

export function AccountControl() {
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (auth.status === "loading") return <span className="account-control__loading" aria-live="polite">계정 확인 중</span>;
  if (auth.status !== "authenticated") return <Link className="button button--accent button--small" href="/login/">로그인</Link>;

  return (
    <div className="account-control">
      <Link className="text-link text-link--small" href="/account/">계정</Link>
      <button
        className="button button--outline button--small"
        type="button"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          try {
            await auth.signOut();
          } finally {
            setSigningOut(false);
          }
        }}
      >
        {signingOut ? "로그아웃 중" : "로그아웃"}
      </button>
    </div>
  );
}

export function AccountPanel() {
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (auth.status === "loading") return <div className="auth-card"><p className="eyebrow">LEGENDSTUDY ACCOUNT</p><p className="auth-status-message" aria-live="polite">세션을 확인하고 있습니다.</p></div>;
  if (auth.status === "unconfigured") return <AuthConfigurationNotice />;
  if (!auth.user) {
    return (
      <div className="auth-card">
        <p className="eyebrow eyebrow--accent">LEGENDSTUDY ACCOUNT</p>
        <h1>로그인이 필요한<br />계정 영역입니다.</h1>
        <p className="auth-card__lead">공개 LAB 소개와 안내는 로그인 없이 볼 수 있습니다. 향후 개인 답안과 학습 기록은 동일한 LegendStudy Account로 분리해 연결합니다.</p>
        <Link className="button button--primary" href="/login/">LegendStudy Account 로그인 <span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY ACCOUNT</p>
      <h1>계정이 연결되었습니다.</h1>
      <dl className="auth-account-details"><div><dt>이메일</dt><dd>{auth.user.email ?? "이메일 정보 없음"}</dd></div><div><dt>계정 ID</dt><dd className="auth-account-details__id">동일 LegendStudy Auth identity로 연결됨</dd></div></dl>
      <p className="auth-card__lead">현재 LAB은 공개 안내를 우선 제공합니다. 개인 답안, 첨삭, 결제, 학습 기록은 아직 이 계정에 저장하거나 연결하지 않습니다.</p>
      <div className="button-row"><Link className="button button--outline" href="/">LAB 메인으로 돌아가기</Link><button className="button button--primary" type="button" disabled={signingOut} onClick={async () => { setSigningOut(true); try { await auth.signOut(); } finally { setSigningOut(false); } }}>{signingOut ? "로그아웃 중" : "로그아웃"}</button></div>
    </div>
  );
}

export function AuthConfigurationNotice() {
  return <div className="auth-card auth-card--notice"><p className="eyebrow eyebrow--accent">LEGENDSTUDY ACCOUNT</p><h1>계정 연결을<br />준비하고 있습니다.</h1><p className="auth-card__lead">이 배포에는 아직 LegendStudy Supabase public configuration이 연결되지 않았습니다. 공개 안내는 계속 이용할 수 있으며, 계정 로그인은 동일 Supabase project의 public URL과 publishable key가 Cloudflare Pages에 설정된 뒤 활성화됩니다.</p><Link className="button button--outline" href="/">LAB 메인으로 돌아가기</Link></div>;
}
