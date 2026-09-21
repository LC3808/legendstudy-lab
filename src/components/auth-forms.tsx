"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { AuthConfigurationNotice } from "@/components/account-control";
import { useAuth } from "@/components/auth-context";
import { browserRedirectTo, getBrowserAuthConfig, type SocialProvider } from "@/lib/auth-config";
import { readResetNotice, RESET_SUCCESS_PATH } from "@/lib/recovery-redirect";
import { appendReturnPath, getSafeReturnPath } from "@/lib/return-to";

export type AuthFormMode = "login" | "signup" | "forgot" | "reset";

const providerLabels: Record<SocialProvider, string> = { google: "Google", apple: "Apple", kakao: "Kakao" };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상으로 입력해 주세요.";
  return null;
}

function safeMessage(mode: AuthFormMode): string {
  if (mode === "login") return "로그인하지 못했습니다. 이메일과 비밀번호를 다시 확인해 주세요.";
  if (mode === "signup") return "가입을 완료하지 못했습니다. 입력 내용을 확인하거나 잠시 후 다시 시도해 주세요.";
  if (mode === "reset") return "비밀번호를 변경하지 못했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다.";
  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function titleFor(mode: AuthFormMode): { eyebrow: string; title: ReactNode; lead: string } {
  switch (mode) {
    case "signup": return { eyebrow: "LEGENDSTUDY ACCOUNT / SIGN UP", title: <>같은 계정으로<br />이어가세요.</>, lead: "LegendStudy+와 LAB은 같은 Supabase Auth identity를 사용하도록 설계되어 있습니다. 가입 후 이메일 확인이 필요할 수 있습니다." };
    case "forgot": return { eyebrow: "LEGENDSTUDY ACCOUNT / RECOVERY", title: <>비밀번호를<br />재설정하세요.</>, lead: "가입 여부를 노출하지 않기 위해, 입력한 이메일이 등록되어 있는지와 관계없이 같은 안내를 제공합니다." };
    case "reset": return { eyebrow: "LEGENDSTUDY ACCOUNT / RESET", title: <>새 비밀번호를<br />설정하세요.</>, lead: "이 페이지는 비밀번호 재설정 이메일의 유효한 링크를 통해서만 비밀번호 변경을 완료합니다." };
    default: return { eyebrow: "LEGENDSTUDY ACCOUNT / LOGIN", title: <>LegendStudy Account로<br />로그인하세요.</>, lead: "공개 서비스 안내는 로그인 없이 이용할 수 있습니다. 로그인은 향후 개인 학습 기록과 분석 영역을 같은 계정으로 연결하기 위한 기반입니다." };
  }
}

function socialButtonClass(provider: SocialProvider): string {
  return `auth-social__button auth-social__button--${provider}`;
}

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = titleFor(mode);
  const providers = useMemo(() => getBrowserAuthConfig()?.socialProviders ?? [], []);
  const returnPath = useMemo(() => {
    if (typeof window === "undefined") return "/home/";
    return getSafeReturnPath(new URLSearchParams(window.location.search).get("next"));
  }, []);
  const resetNotice = useMemo(() => {
    if (mode !== "login" || typeof window === "undefined") return null;
    return readResetNotice(window.location.search);
  }, [mode]);
  const recoveryLinkState = useMemo<"checking" | "valid" | "invalid" | "direct">(() => {
    if (mode !== "reset" || typeof window === "undefined") return "checking";
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const hasError = Boolean(hash.get("error") || query.get("error"));
    const hasCallbackShape = Boolean(hash.get("access_token") || query.get("code") || hash.get("type") === "recovery");
    return hasError ? "invalid" : auth.recoveryActive ? "valid" : hasCallbackShape ? "checking" : "direct";
  }, [auth.recoveryActive, mode]);

  useEffect(() => {
    if (mode === "login" && auth.status === "authenticated" && !submitting) {
      window.location.replace(returnPath);
    }
  }, [auth.status, mode, returnPath, submitting]);

  if (auth.status === "unconfigured") return <AuthConfigurationNotice />;

  const needsPassword = mode === "login" || mode === "signup" || mode === "reset";
  const canSubmit = !submitting && auth.status !== "loading" && (mode !== "reset" || recoveryLinkState === "valid");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (mode !== "reset" && !isValidEmail(email.trim())) {
      setError("이메일 형식을 확인해 주세요.");
      return;
    }
    if (needsPassword) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    }
    if ((mode === "signup" || mode === "reset") && password !== confirmation) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    if (!auth.client) return;

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error: signInError } = await auth.client.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        window.location.assign(returnPath);
      } else if (mode === "signup") {
        const { data, error: signUpError } = await auth.client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: browserRedirectTo(`/login/?next=${encodeURIComponent(returnPath)}`) },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          window.location.assign(returnPath);
        } else {
          setMessage("가입 확인 이메일을 보냈습니다. 메일의 링크를 열어 이메일 확인을 완료해 주세요.");
        }
      } else if (mode === "forgot") {
        const { error: resetError } = await auth.client.auth.resetPasswordForEmail(email.trim(), { redirectTo: browserRedirectTo("/reset-password/") });
        if (resetError) throw resetError;
        setMessage("등록 여부와 관계없이 동일한 안내를 제공합니다. 해당 이메일이 등록되어 있다면 비밀번호 재설정 메일을 확인해 주세요.");
      } else {
        const { error: updateError } = await auth.client.auth.updateUser({ password });
        if (updateError) throw updateError;
        // End the temporary recovery session and require a fresh sign-in with
        // the new password. The success notice is shown on the login page.
        auth.completeRecovery();
        await auth.signOut();
        window.location.assign(RESET_SUCCESS_PATH);
        return;
      }
    } catch {
      setError(safeMessage(mode));
    } finally {
      setSubmitting(false);
    }
  };

  const signInWithProvider = async (provider: SocialProvider) => {
    if (!auth.client || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: oauthError } = await auth.client.auth.signInWithOAuth({ provider, options: { redirectTo: browserRedirectTo(`/login/?next=${encodeURIComponent(returnPath)}`) } });
      if (oauthError) throw oauthError;
    } catch {
      setError("소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page content-wrap">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow eyebrow--accent">{copy.eyebrow}</p>
        <h1 id="auth-title">{copy.title}</h1>
        <p className="auth-card__lead">{copy.lead}</p>

        {resetNotice && <p className="auth-callout auth-callout--success" role="status">{resetNotice}</p>}

        {mode === "reset" && recoveryLinkState !== "valid" && (
          <div className="auth-callout auth-callout--warning" role="status">
            {recoveryLinkState === "checking" ? "재설정 링크를 확인하고 있습니다." : recoveryLinkState === "invalid" ? "이 링크는 만료되었거나 이미 사용되었습니다. 새 비밀번호 재설정을 요청해 주세요." : "비밀번호 재설정은 이메일에서 받은 링크를 통해서만 진행할 수 있습니다."}
          </div>
        )}

        <form className="auth-form" onSubmit={submit} noValidate>
          {mode !== "reset" && <label><span>이메일</span><input autoComplete="email" disabled={!canSubmit} inputMode="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" type="email" value={email} /></label>}
          {needsPassword && <label><span>{mode === "reset" ? "새 비밀번호" : "비밀번호"}</span><span className="auth-password-field"><input autoComplete={mode === "signup" || mode === "reset" ? "new-password" : "current-password"} disabled={!canSubmit} name="password" onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"} className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? "숨기기" : "표시"}</button></span></label>}
          {(mode === "signup" || mode === "reset") && <label><span>비밀번호 확인</span><input autoComplete="new-password" disabled={!canSubmit} name="confirmation" onChange={(event) => setConfirmation(event.target.value)} type={showPassword ? "text" : "password"} value={confirmation} /></label>}
          {error && <p className="auth-callout auth-callout--error" role="alert">{error}</p>}
          {message && <p className="auth-callout auth-callout--success" role="status">{message}</p>}
          <button className="button button--primary auth-submit" disabled={!canSubmit} type="submit">{submitting ? "처리 중" : mode === "login" ? "로그인" : mode === "signup" ? "회원가입" : mode === "forgot" ? "재설정 이메일 보내기" : "새 비밀번호 저장"}</button>
        </form>

        {mode === "login" && <div className="auth-links"><Link href="/forgot-password/">비밀번호를 잊으셨나요?</Link><Link href={appendReturnPath("/signup/", returnPath)}>회원가입</Link></div>}
        {mode === "signup" && <div className="auth-links"><Link href={appendReturnPath("/login/", returnPath)}>이미 계정이 있으신가요? 로그인</Link></div>}
        {mode === "forgot" && <div className="auth-links"><Link href={appendReturnPath("/login/", returnPath)}>로그인으로 돌아가기</Link><Link href="/support/">가입한 이메일을 잊으셨나요?</Link></div>}
        {mode === "reset" && <div className="auth-links"><Link href="/forgot-password/">새 재설정 링크 요청</Link><Link href="/account/">내 계정으로 가기</Link></div>}

        {providers.length > 0 && <div className="auth-social"><p>다른 방법으로 로그인</p>{providers.map((provider) => <button className={socialButtonClass(provider)} disabled={submitting} key={provider} onClick={() => void signInWithProvider(provider)} type="button"><span aria-hidden="true" className="auth-social__icon"><Image alt="" height={24} src={`/brand/social/${provider === "google" ? "google-g" : provider === "apple" ? "apple-sign-in-symbol" : "kakao-login-symbol"}.png`} unoptimized width={24} /></span>{providerLabels[provider]}로 계속하기</button>)}</div>}
        <Link className="auth-back-link" href="/">서비스 안내로 돌아가기</Link>
      </section>
    </div>
  );
}
