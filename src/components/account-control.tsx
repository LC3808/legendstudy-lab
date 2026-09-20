"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { appendReturnPath } from "@/lib/return-to";

const loginPath = appendReturnPath("/login/", "/account/");

export function AccountControl() {
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (auth.status === "loading") return <span className="account-control__loading" aria-live="polite">계정 확인 중</span>;
  if (auth.status === "unconfigured") return <Link className="button button--outline button--small" href="/account/">계정 안내</Link>;
  if (auth.status !== "authenticated") return <Link className="button button--accent button--small" href={loginPath}>로그인</Link>;

  return (
    <div className="account-control">
      <Link className="text-link text-link--small" href="/account/">My Account</Link>
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
        <p className="eyebrow eyebrow--accent">MY ACCOUNT</p>
        <h1>계정이 필요한<br />개인 영역입니다.</h1>
        <p className="auth-card__lead">공개 서비스 안내는 로그인 없이 볼 수 있습니다. 개인 학습 기록, 분석, 논술 답안 이력은 같은 LegendStudy Account로 연결될 예정이며, 현재는 아직 저장·동기화되지 않습니다.</p>
        <Link className="button button--primary" href={loginPath}>LegendStudy Account 로그인 <span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-card auth-card--account">
      <p className="eyebrow eyebrow--accent">MY ACCOUNT</p>
      <h1>내 계정</h1>
      <p className="auth-card__lead">LegendStudy+와 LAB이 같은 Auth identity를 사용하기 위한 브라우저 세션입니다. 이 화면은 계정 상태만 표시하며, 개인 학습 데이터는 아직 이 웹에 저장하지 않습니다.</p>
      <dl className="auth-account-details">
        <div><dt>이메일</dt><dd>{auth.user.email ?? "이메일 정보 없음"}</dd></div>
        <div><dt>계정 연결</dt><dd className="auth-account-details__id">LegendStudy Auth identity로 연결됨</dd></div>
      </dl>
      <section className="account-roadmap" aria-labelledby="account-roadmap-title">
        <p className="eyebrow">MY SPACE / PREPARING</p>
        <h2 id="account-roadmap-title">계정 기반으로 이어질 영역</h2>
        <div className="account-roadmap__grid">
          <article><strong>학습 분석</strong><span>성적·학습 기록의 깊은 분석은 별도 데이터·권한 설계 후 제공됩니다.</span></article>
          <article><strong>나의 논술</strong><span>답안·첨삭 이력은 평가 품질과 보관 정책이 확정된 뒤 연결됩니다.</span></article>
          <article><strong>활동 포트폴리오</strong><span>증거 기반의 기록 정리와 검토는 장기 모듈로 준비합니다.</span></article>
        </div>
      </section>
      <div className="button-row"><Link className="button button--outline" href="/">서비스 안내 보기</Link><button className="button button--primary" type="button" disabled={signingOut} onClick={async () => { setSigningOut(true); try { await auth.signOut(); } finally { setSigningOut(false); } }}>{signingOut ? "로그아웃 중" : "로그아웃"}</button></div>
    </div>
  );
}

export function AuthConfigurationNotice() {
  return <div className="auth-card auth-card--notice"><p className="eyebrow eyebrow--accent">LEGENDSTUDY ACCOUNT</p><h1>계정 연결을<br />준비하고 있습니다.</h1><p className="auth-card__lead">이 배포에는 아직 LegendStudy Supabase browser configuration이 연결되지 않았습니다. 공개 안내는 계속 이용할 수 있으며, 계정 로그인은 같은 Supabase project의 public URL과 publishable key가 Cloudflare Pages에 설정되고 이메일·redirect가 확인된 뒤 활성화됩니다.</p><Link className="button button--outline" href="/">서비스 안내 보기</Link></div>;
}
