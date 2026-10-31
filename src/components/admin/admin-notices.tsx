"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-context";
import {
  categories,
  noticesClient,
  type Notice,
  type NoticeInput,
  type NoticeFeed,
} from "@/lib/notices/client";
const empty: NoticeInput = {
  title: "",
  content: "",
  category: "general",
  status: "draft",
  is_pinned: false,
  is_public: true,
  show_app: true,
  show_web: true,
  published_at: null,
  expires_at: null,
};
export function AdminNotices() {
  const auth = useAuth();
  return <Editor key={auth.user?.id ?? "guest"} />;
}
function Editor() {
  const { client } = useAuth();
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [feed, setFeed] = useState<{
    key: string;
    data?: NoticeFeed;
    error?: boolean;
  } | null>(null);
  const [draft, setDraft] = useState<NoticeInput>({ ...empty });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const key = `${page}:${nonce}`;
  useEffect(() => {
    if (!client) return;
    let active = true;
    noticesClient(client)
      .adminList(page * 20)
      .then(
        (data) => {
          if (active) setFeed({ key, data });
        },
        () => {
          if (active) setFeed({ key, error: true });
        },
      );
    return () => {
      active = false;
    };
  }, [client, page, key]);
  function edit(n: Notice) {
    setDraft({ ...n });
    setMessage("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!client || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const saved = await noticesClient(client).save(draft);
      setDraft(saved);
      setNonce((n) => n + 1);
      setMessage("저장했습니다. 게시 기간과 노출 설정에 따라 표시됩니다.");
    } catch (error) {
      const text = String((error as { message?: string }).message ?? "");
      if (text.includes("NOTICE_CONFLICT")) setNonce((n) => n + 1);
      setMessage(
        text.includes("NOTICE_CONFLICT")
          ? "다른 수정 사항이 있습니다. 목록에서 다시 선택한 후 수정해 주세요."
          : "저장하지 못했습니다. 권한·제목·본문·게시 기간을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  const current = feed?.key === key ? feed : null;
  return (
    <div className="admin-stack">
      <section className="admin-section">
        <h2>공지 관리</h2>
        <button
          className="button button--outline"
          disabled={busy}
          onClick={() => {
            setDraft({ ...empty });
            setMessage("");
          }}
        >
          새 공지
        </button>
        <form
          onSubmit={save}
          style={{ display: "grid", gap: 16, maxWidth: 850 }}
        >
          <fieldset
            disabled={busy}
            style={{
              display: "grid",
              gap: 16,
              border: 0,
              padding: 0,
              minWidth: 0,
            }}
          >
            <label>
              제목
              <input
                required
                maxLength={200}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label>
              본문 (일반 텍스트)
              <textarea
                required
                maxLength={50000}
                rows={12}
                value={draft.content}
                onChange={(e) =>
                  setDraft({ ...draft, content: e.target.value })
                }
                style={{ display: "block", width: "100%" }}
              />
            </label>
            <label>
              카테고리{" "}
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: e.target.value as Notice["category"],
                  })
                }
              >
                {Object.entries(categories).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              상태{" "}
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as Notice["status"],
                  })
                }
              >
                <option value="draft">초안</option>
                <option value="published">게시 (예약 포함)</option>
                <option value="archived">보관</option>
              </select>
            </label>
            <p>
              게시 시작·종료는 현재 기기의 시간대입니다. 시작 시각 전에는 예약
              상태로 숨겨집니다. 종료 후에는 자동으로 노출이 중단됩니다.
            </p>
            <label>
              게시 시작
              <input
                type="datetime-local"
                required={draft.status === "published"}
                value={localDate(draft.published_at)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    published_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
            <button
              type="button"
              className="button button--outline"
              onClick={() =>
                setDraft({ ...draft, published_at: new Date().toISOString() })
              }
            >
              시작 시각을 지금으로 설정
            </button>
            <label>
              게시 종료 (선택)
              <input
                type="datetime-local"
                value={localDate(draft.expires_at)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    expires_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
            {(["is_pinned", "is_public", "show_app", "show_web"] as const).map(
              (k, i) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={draft[k]}
                    onChange={(e) =>
                      setDraft({ ...draft, [k]: e.target.checked })
                    }
                  />{" "}
                  {
                    [
                      "상단 고정",
                      "비로그인 사용자에게도 공개",
                      "APP 노출",
                      "WEB 노출",
                    ][i]
                  }
                </label>
              ),
            )}
            <p>
              삭제 대신 보관을 사용합니다. 수정한 공지는 다시 미읽음으로
              표시됩니다.
            </p>
            <button className="button" type="submit">
              {busy ? "저장 중…" : "저장"}
            </button>
          </fieldset>
        </form>
        <p role="status">{message}</p>
      </section>
      <section className="admin-section">
        <h2>기존 공지</h2>
        <button
          className="button button--outline"
          onClick={() => setNonce((n) => n + 1)}
        >
          목록 새로고침
        </button>
        {!current ? (
          <p>불러오는 중…</p>
        ) : current.error ? (
          <p role="alert">목록을 불러오지 못했습니다.</p>
        ) : (
          <>
            {current.data?.items.map((n) => (
              <p key={n.notice_id}>
                <button
                  className="button button--outline"
                  disabled={busy}
                  onClick={() => edit(n)}
                >
                  {n.title} · {n.status}
                </button>
              </p>
            ))}
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              이전
            </button>{" "}
            {page + 1}{" "}
            <button
              disabled={(page + 1) * 20 >= (current.data?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </>
        )}
      </section>
    </div>
  );
}
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
