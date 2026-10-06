"use client";

import Link from "next/link";
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
  | "dashboard"
  | "members"
  | "credit"
  | "payment"
  | "inquiries"
  | "essay"
  | "quality";

type NavEntry = { key: AdminNavKey; label: string; href: string | null };

/**
 * Every entry is now navigable. The `/ql` Quality Console is reached from here
 * rather than reimplemented: it keeps its own authorization and its own route.
 */
export const ADMIN_NAV: readonly NavEntry[] = [
  { key: "dashboard", label: "대시보드", href: "/admin/" },
  { key: "members", label: "회원", href: "/admin/members/" },
  { key: "credit", label: "Credit", href: "/admin/credit/" },
  { key: "payment", label: "결제", href: "/admin/payment/" },
  { key: "inquiries", label: "1:1 문의", href: "/admin/inquiries/" },
  { key: "essay", label: "논술·수리 운영", href: "/admin/operations/" },
  // The quality console is the existing /ql surface, imported unchanged. Its
  // own authorization (quality_operators) is what guards it; this link grants
  // nothing and the two roles are deliberately not merged.
  { key: "quality", label: "AI 품질", href: "/ql/" },
] as const;

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
  const [state, setState] = useState<AdminQueryState<T>>({ status: "loading" });
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
        if (active) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", kind: adminErrorKind(error) });
      },
    );
    return () => {
      active = false;
    };
  }, [client, nonce, key]);

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
  return <>{children}</>;
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
  return (
    <div className="admin-page content-wrap content-wrap--wide">
      <nav className="admin-nav" aria-label="운영 콘솔">
        <p className="admin-nav__brand">LegendStudy 운영 콘솔</p>
        <ul className="admin-nav__list">
          {ADMIN_NAV.map((entry) => {
            const isActive = entry.key === active;
            if (!entry.href) {
              return (
                <li key={entry.key}>
                  <span className="admin-nav__link admin-nav__link--pending" aria-disabled="true">
                    {entry.label}
                    <span className="admin-nav__tag">미연결</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={entry.key}>
                <Link
                  className={`admin-nav__link${isActive ? " admin-nav__link--active" : ""}`}
                  href={entry.href}
                  aria-current={isActive ? "page" : undefined}
                >
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="admin-main">
        <header className="admin-head">
          <p className="eyebrow eyebrow--accent">{eyebrow}</p>
          <h1>{title}</h1>
          {lead ? <p className="admin-head__lead">{lead}</p> : null}
        </header>
        <AdminGate>{children}</AdminGate>
      </div>
    </div>
  );
}
