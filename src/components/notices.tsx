"use client";
import Link from "next/link";
import "./notices.css";
import { NoticeContent } from "./notice-content";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import {
  categories,
  noticesClient,
  type Notice,
  type NoticeFeed,
} from "@/lib/notices/client";

export function Notices() {
  const auth = useAuth();
  return <NoticeList key={auth.user?.id ?? "guest"} />;
}
function NoticeList() {
  const { client, status } = useAuth();
  const [offset, setOffset] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    feed?: NoticeFeed;
    error?: boolean;
  } | null>(null);
  const key = `${offset}:${nonce}`;
  useEffect(() => {
    if (!client || status === "loading") return;
    let active = true;
    noticesClient(client)
      .list(offset)
      .then(
        (feed) => {
          if (active) setResult({ key, feed });
        },
        () => {
          if (active) setResult({ key, error: true });
        },
      );
    return () => {
      active = false;
    };
  }, [client, status, offset, key]);
  useEffect(() => {
    const refresh = () => setNonce((n) => n + 1);
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const current = result?.key === key ? result : null;
  return (
    <section className="page-section content-wrap content-wrap--detail notice-board">
      <header className="notice-board-heading"><div><h1>공지사항</h1><p>레전드스터디의 새 소식과 서비스 안내</p></div>
      <button
        className="button button--outline"
        onClick={() => setNonce((n) => n + 1)}
      >
        새로고침
      </button></header>
      {!client && status !== "loading" ? (
        <p role="alert">공지사항 연결을 확인해 주세요.</p>
      ) : !current ? (
        <p role="status">불러오는 중…</p>
      ) : current.error ? (
        <p role="alert">공지사항을 불러오지 못했습니다.</p>
      ) : (
        current.feed && (
          <>
            {status === "authenticated" && (
              <p className="notice-unread">읽지 않은 공지 <strong>{current.feed.unread}개</strong></p>
            )}
            {current.feed.items.length === 0 && (
              <p>게시된 공지사항이 없습니다.</p>
            )}
            {current.feed.items.map((n) => (
              <article
                key={n.notice_id}
                className={`notice-card ${n.is_pinned ? "notice-card--pinned" : ""}`}
              >
                <p>
                  {n.is_pinned && <span className="notice-tag notice-tag--pin">고정 공지</span>}
                  <span className="notice-tag">{categories[n.category]}</span>{" "}
                  {status === "authenticated" && !n.is_read && (
                    <strong className="notice-tag notice-tag--new">NEW</strong>
                  )}
                </p>
                <h2>
                  <Link
                    href={`/notices/detail/?id=${encodeURIComponent(n.notice_id)}`}
                  >
                    {n.title}
                  </Link>
                </h2>
                <time>{n.published_at?.slice(0, 10)}</time>
              </article>
            ))}
            <nav className="notice-pagination" aria-label="공지 페이지">
              <button
                className="button button--outline"
                disabled={offset === 0}
                onClick={() => setOffset((n) => n - 20)}
              >
                이전
              </button>{" "}
              <span>
                {offset / 20 + 1} /{" "}
                {Math.max(1, Math.ceil(current.feed.total / 20))}
              </span>{" "}
              <button
                className="button button--outline"
                disabled={offset + 20 >= current.feed.total}
                onClick={() => setOffset((n) => n + 20)}
              >
                다음
              </button>
            </nav>
          </>
        )
      )}
    </section>
  );
}
export function NoticeDetail() {
  const auth = useAuth();
  return <Detail key={auth.user?.id ?? "guest"} />;
}
function Detail() {
  const { client, status } = useAuth();
  const [state, setState] = useState<{
    notice?: Notice | null;
    error?: boolean;
    readFailed?: boolean;
  } | null>(null);
  useEffect(() => {
    if (!client || status === "loading") return;
    let active = true;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      queueMicrotask(() => {
        if (active) setState({ notice: null });
      });
      return () => {
        active = false;
      };
    }
    void (async () => {
      try {
        const api = noticesClient(client);
        const notice = await api.detail(id);
        if (!active) return;
        setState({ notice });
        if (notice && status === "authenticated") {
          try {
            const ok = await api.markRead(notice);
            if (active && !ok) setState({ notice, readFailed: true });
          } catch {
            if (active) setState({ notice, readFailed: true });
          }
        }
      } catch {
        if (active) setState({ error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [client, status]);
  return (
    <section className="page-section content-wrap content-wrap--detail notice-board">
      <Link href="/notices/">← 공지사항</Link>
      {!client && status !== "loading" ? (
        <p>공지사항 연결을 확인해 주세요.</p>
      ) : !state ? (
        <p>불러오는 중…</p>
      ) : state.error ? (
        <p role="alert">
          공지를 불러오지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
      ) : !state.notice ? (
        <p>게시가 종료되었거나 볼 수 없는 공지입니다.</p>
      ) : (
        <article
          className="notice-detail"
        >
          <header className="notice-detail-heading"><h1>{state.notice.title}</h1>
          <p>
            {categories[state.notice.category]} ·{" "}
            {state.notice.published_at?.slice(0, 10)}
          </p>
          </header><div className="notice-detail-body"><NoticeContent content={state.notice.content} document={state.notice.content_document}/></div>
          {state.readFailed && (
            <p role="status">
              읽음 상태를 저장하지 못했습니다. 다시 열면 재시도합니다.
            </p>
          )}
        </article>
      )}
    </section>
  );
}

export function NoticeNavLink() {
  const auth = useAuth();
  return <UnreadLink key={auth.user?.id ?? "guest"} />;
}
function UnreadLink() {
  const { client, status } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!client || status !== "authenticated") return;
    let active = true;
    const refresh = () => {
      void noticesClient(client)
        .list()
        .then(
          (feed) => {
            if (active) setCount(feed.unread);
          },
          () => {
            if (active) setCount(0);
          },
        );
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [client, status]);
  return (
    <Link href="/notices/">
      공지사항
      {count > 0 && status === "authenticated"
        ? ` (${count > 99 ? "99+" : count})`
        : ""}
    </Link>
  );
}
