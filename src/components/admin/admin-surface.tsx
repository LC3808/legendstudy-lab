"use client";

import Link from "next/link";
import {ADMIN_NAV,ADMIN_GROUPS} from "@/lib/admin/navigation";
export {ADMIN_NAV} from "@/lib/admin/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/auth-context";
import { createAdminClient, type AdminClient } from "@/lib/admin/client";
import { adminErrorCopy, adminErrorKind, type AdminErrorKind } from "@/lib/admin/errors";

/**
 * Operations console shell.
 *
 * The console is an internal surface: it is not linked from the public site, it
 * is disallowed in robots.txt, and every page carries `noindex`. Authorization
 * is decided by the database through `admin_operator()`; this component only
 * mirrors that decision for the operator, and never treats a hidden control as
 * an authorization mechanism.
 */

export type AdminNavKey =
  | "material-sync"
  | "data"
  | "analytics"
  | "dashboard"
  | "members"
  | "credit"
  | "payment"
  | "beta"
  | "beta-usage"
  | "beta-failures"
  | "essay-feedback"
  | "notices"
  | "inquiries"
  | "essay"
  | "quality"
  | "materials";

export function useAdminClient(): AdminClient | null {
  const { client } = useAuth();
  return useMemo(() => (client ? createAdminClient(client) : null), [client]);
}

// --- query hook --------------------------------------------------------------

export type AdminQueryState<T> =
  | { status: "loading" }
  | { status: "error"; kind: AdminErrorKind }
  | { status: "ready"; data: T };

/**
 * `key` is the serialized identity of the request. The loader is read through a
 * ref so a new closure identity does not re-issue the same query.
 */
export function useAdminQuery<T>(
  loader: ((client: AdminClient) => Promise<T>) | null,
  key: string,
): { state: AdminQueryState<T>; reload: () => void } {
  const client = useAdminClient();
  const [result, setResult] = useState<{ key: string; nonce: number; state: AdminQueryState<T> } | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);

  // Sync the ref in its own effect, declared before the query effect so it runs
  // first. Writing a ref during render is not allowed.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    const run = loaderRef.current;
    if (!client || !run) {
      return;
    }
    let active = true;
    run(client).then(
      (data) => {
        if (active) setResult({ key, nonce, state: { status: "ready", data } });
      },
      (error: unknown) => {
        if (active) setResult({ key, nonce, state: { status: "error", kind: adminErrorKind(error) } });
      },
    );
    return () => {
      active = false;
    };
  }, [client, nonce, key]);

  const state: AdminQueryState<T> = result?.key === key && result?.nonce === nonce ? result.state : { status: "loading" };
  return { state, reload: () => setNonce((value) => value + 1) };
}

// --- state panels ------------------------------------------------------------

export function AdminPanel({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger";
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`admin-panel admin-panel--${tone}`} role={tone === "danger" ? "alert" : undefined}>
      <p className="admin-panel__title">{title}</p>
      {children ? <div className="admin-panel__body">{children}</div> : null}
    </div>
  );
}

export function AdminErrorPanel({ kind, onRetry }: { kind: AdminErrorKind; onRetry?: () => void }) {
  const copy = adminErrorCopy(kind);
  const tone = kind === "UNAUTHORIZED" || kind === "UNAUTHENTICATED" ? "warning" : "danger";
  return (
    <AdminPanel tone={tone} title={copy.title}>
      <p>{copy.body}</p>
      <p className="admin-panel__code">상태 코드: {kind}</p>
      {onRetry ? (
        <button type="button" className="button button--outline button--small" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </AdminPanel>
  );
}

export function AdminLoading({ label = "불러오는 중입니다" }: { label?: string }) {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-loading__dot" aria-hidden="true" />
      {label}
    </div>
  );
}

export function AdminEmpty({ title, body }: { title: string; body?: string }) {
  return (
    <AdminPanel tone="info" title={title}>
      {body ? <p>{body}</p> : null}
    </AdminPanel>
  );
}

// --- gate --------------------------------------------------------------------

type GateState =
  | { status: "allowed" }
  | { status: "denied"; kind: AdminErrorKind };

/**
 * UI-side mirror of the database gate. A denied caller never mounts the data
 * views, so no read is even attempted; and a caller who bypasses this component
 * still receives PT401 from the database.
 *
 * The synchronous outcomes are derived during render rather than written from an
 * effect, and the asynchronous probe is keyed by the signed-in account, so a
 * different account can never inherit the previous account's answer.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { status, client, user } = useAuth();
  const admin = useAdminClient();
  const accountId = user?.id ?? null;
  const [probe, setProbe] = useState<{ accountId: string | null; result: GateState } | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !client || !admin) return;
    let active = true;
    admin.isOperator().then(
      (allowed) => {
        if (!active) return;
        setProbe({
          accountId,
          result: allowed ? { status: "allowed" } : { status: "denied", kind: "UNAUTHORIZED" },
        });
      },
      (error: unknown) => {
        if (active) setProbe({ accountId, result: { status: "denied", kind: adminErrorKind(error) } });
      },
    );
    return () => {
      active = false;
    };
  }, [status, client, admin, accountId]);

  if (status === "loading") return <AdminLoading label="운영자 권한을 확인하는 중입니다" />;
  if (status === "unconfigured" || !client || !admin) return <AdminErrorPanel kind="NOT_INSTALLED" />;
  if (status === "anonymous") return <AdminErrorPanel kind="UNAUTHENTICATED" />;

  const settled = probe && probe.accountId === accountId ? probe.result : null;
  if (settled?.status === "denied") return <AdminErrorPanel kind={settled.kind} />;
  if (settled?.status !== "allowed") return <AdminLoading label="운영자 권한을 확인하는 중입니다" />;
  return <div key={accountId}>{children}</div>;
}

// --- shell -------------------------------------------------------------------

export function AdminSurface({
  active,
  eyebrow,
  title,
  lead,
  children,
}: {
  active: AdminNavKey;
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  function closeMenu() { setMenuOpen(false); menuButton.current?.focus(); }
  return (
    <AdminGate>
    <div className="admin-console-toolbar"><button ref={menuButton} className="admin-menu-toggle" aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(!menuOpen)}>☰ 메뉴</button><span>LEGENDSTUDY+ <span className="admin-console-subtitle">INTELLIGENCE CONSOLE</span></span><Link href="/essay-lab/">서비스로 돌아가기 ↗</Link></div>
    <div className="admin-page content-wrap content-wrap--wide">
      <div id="admin-navigation" className={`admin-navigation-wrap${menuOpen ? ' is-open' : ''}`} onKeyDown={e=>{if(e.key==='Escape')closeMenu();}}>
        <button className="admin-menu-close" onClick={closeMenu}>메뉴 닫기 ✕</button>
        <AdminNavigation active={active} onNavigate={()=>setMenuOpen(false)} />
      </div>
      {menuOpen && <button className="admin-menu-backdrop" aria-label="메뉴 닫기" onClick={closeMenu}/> }

      <div className="admin-main">
        <header className="admin-head">
          <p className="eyebrow eyebrow--accent">운영 콘솔 / {title}<span className="sr-only"> {eyebrow}</span></p>
          <h1>{title}</h1>
          {lead ? <p className="admin-head__lead">{lead}</p> : null}
        </header>
        {children}
      </div>
    </div>
    </AdminGate>
  );
}


function AdminNavigation({ active, onNavigate }: { active: AdminNavKey; onNavigate: () => void }) {
  const pathname = usePathname();
  const support = useAdminQuery(client => client.supportMetrics(), "support-badge");
  useSupportRefresh(support.reload);
  const selected = (entry: {key:string;href:string|null}) => entry.key === active || (active === "data" && pathname?.replace(/\/$/, "") === entry.href?.replace(/\/$/, ""));
  const dashboard = ADMIN_NAV.find(entry => entry.key === "dashboard")!;
  const groups = ADMIN_GROUPS.map(group=>({title:group.title,entries:group.keys.map(key=>ADMIN_NAV.find(entry=>entry.key===key)!)}));
  return <nav className="admin-nav" aria-label="운영 콘솔">
    <p className="admin-nav__brand">LegendStudy<span>+</span><small>INTELLIGENCE CONSOLE</small></p>
    <Link className={`admin-nav__link admin-nav__dashboard${selected(dashboard) ? " admin-nav__link--active" : ""}`}
      href={dashboard.href!} onClick={onNavigate} aria-current={selected(dashboard) ? "page" : undefined}>대시보드</Link>
    {groups.map((group) => <section className="admin-nav__group" key={group.title} aria-label={group.title}>
      <details open><summary className="admin-nav__heading">{group.title}</summary>
      <ul className="admin-nav__list">{group.entries.map((entry) => <li key={entry.key}>
        <Link className={`admin-nav__link${selected(entry) ? " admin-nav__link--active" : ""}`}
          href={entry.href!} onClick={onNavigate} aria-current={selected(entry) ? "page" : undefined}>{entry.label}{entry.key === "inquiries" && <span aria-label="미처리 문의"> · {support.state.status==="ready" ? support.state.data.open : support.state.status==="error" ? "확인 필요" : "…"}</span>}</Link>
      </li>)}</ul>
    </details></section>)}
  </nav>;
}

/** Refresh support counts without replacing an open reply draft. */
export function useSupportRefresh(reload:()=>void, enabled=true) {
  const latest=useRef(reload);
  useEffect(()=>{latest.current=reload;});
  useEffect(()=>{
    if(!enabled) return;
    const refresh=()=>latest.current();
    const timer=setInterval(refresh,30000);
    window.addEventListener("support-changed",refresh);
    window.addEventListener("focus",refresh);
    return()=>{clearInterval(timer);window.removeEventListener("support-changed",refresh);window.removeEventListener("focus",refresh);};
  },[enabled]);
}
