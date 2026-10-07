"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { useCreditSummary } from "@/components/credit-balance";
import { AdminEntry } from "@/components/admin/admin-entry";

// A plain login entry: success resolves to the canonical landing unless a
// valid internal next is present. It no longer forces a return to /account/.
const loginPath = "/login/";

export function AccountControl() {
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (auth.status === "loading") return <span className="account-control__loading" aria-live="polite">계정 확인 중</span>;
  if (auth.status === "unconfigured") return <Link className="button button--outline button--small" href={loginPath}>로그인</Link>;
  if (auth.status !== "authenticated") return <Link className="button button--accent button--small" href={loginPath}>로그인</Link>;

  return (
    <div className="account-control">
      <HeaderCredit />
      <AdminEntry />
      <Link className="text-link text-link--small" href="/account/">마이페이지</Link>
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

function HeaderCredit() {
  const { state } = useCreditSummary();
  if (state.status === "signed-out") return null;
  return <span className="header-credit" aria-live="polite">{state.status === "ready" ? `첨삭권 ${state.value.spendable}` : state.status === "loading" ? "첨삭권 확인 중" : "첨삭권 확인 불가"}</span>;
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
        <h1>로그인이 필요합니다.</h1>
        <p className="auth-card__lead">로그인하고 내 계정과 첨삭권을 확인하세요.</p>
        <Link className="button button--primary" href="/login/?next=%2Faccount%2F">로그인 <span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-card auth-card--account">
      <p className="eyebrow eyebrow--accent">MY ACCOUNT</p>
      <h1>내 계정</h1>
      <p className="auth-card__lead">레전드스터디+와 LAB을 하나의 계정으로 이용하세요.</p>
      <dl className="auth-account-details">
        <div><dt>이메일</dt><dd>{auth.user.email ?? "이메일 정보 없음"}</dd></div>
        <div><dt>계정 연결</dt><dd className="auth-account-details__id">LegendStudy Plus</dd></div>
      </dl>
      <div className="button-row"><Link className="button button--outline" href="/">처음으로</Link><button className="button button--primary" type="button" disabled={signingOut} onClick={async () => { setSigningOut(true); try { await auth.signOut(); } finally { setSigningOut(false); } }}>{signingOut ? "로그아웃 중" : "로그아웃"}</button></div>
    </div>
  );
}

export function AuthConfigurationNotice() {
  return <div className="auth-page content-wrap"><section className="auth-card auth-card--notice"><h1>로그인</h1><p className="auth-card__lead">지금은 로그인에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.</p><Link className="text-link" href="/support/">고객 지원</Link></section></div>;
}
