"use client";
import "../notices.css";
import { NoticeEditor } from "./notice-editor";
import { parseDocument, plainContent } from "@/lib/notices/document";
import { AdminDataTable } from "./admin-data-table";
import { formatDateTime } from "@/lib/admin/format";
import { describeError } from '@/lib/admin/errors';
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
    error?: string;
  } | null>(null);
  const [draft, setDraft] = useState<NoticeInput>({ ...empty });
  const [editorKey,setEditorKey] = useState(0);
  const [richReady,setRichReady] = useState(false);
  const [uploading,setUploading] = useState(false);
  useEffect(() => {
    let active = true;
    if(client) void noticesClient(client).editorCapability().then(r=>{if(active)setRichReady(r?.version===2);},()=>{if(active)setRichReady(false);});
    return ()=>{active=false;};
  },[client]);
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
        (error) => {
          if (active) setFeed({ key, error: describeError(error) });
        },
      );
    return () => {
      active = false;
    };
  }, [client, page, key]);
  function edit(n: Notice) {
    setEditorKey(k=>k+1);
    setDraft({ ...n });
    setMessage("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!client || busy || uploading) return;
    if (draft.content_document && (!richReady || !parseDocument(draft.content_document) || !plainContent(draft.content_document))) {
      setMessage("본문과 이미지 설명, 편집기 연결 상태를 확인해 주세요."); return;
    }
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
    <div className="admin-stack notice-admin">
      <section className="admin-section">
        <div className="notice-form-heading"><h2>{draft.notice_id ? "공지 수정" : "새 공지 작성"}</h2>
        <button
          className="button button--outline"
          disabled={busy || uploading}
          onClick={() => {
            setEditorKey(k=>k+1);
            setDraft({ ...empty });
            setMessage("");
          }}
        >
          새 공지
        </button></div>
        <form
          onSubmit={save}
          className="notice-form"
        >
          <fieldset
            disabled={busy || uploading}
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
            {richReady ? <NoticeEditor key={editorKey} disabled={busy} content={draft.content} document={draft.content_document} onBusyChange={setUploading} onChange={(content,content_document)=>setDraft(old=>({...old,content,content_document}))}/> : <>
              <p role="status">서식·이미지 편집기 연결 준비 중입니다. 기존 텍스트 공지는 계속 작성할 수 있어요.</p>
            <label>
              본문 (일반 텍스트)
              <textarea
                required
                maxLength={50000}
                rows={12}
                value={draft.content}
                readOnly={!!draft.content_document}
                onChange={(e) =>
                  setDraft({ ...draft, content: e.target.value })
                }
                style={{ display: "block", width: "100%" }}
              />
            </label>
              {draft.content_document && <p role="alert">서식 공지는 편집기 연결 후 수정해 주세요.</p>}
            </>}
            <section className="notice-settings"><h3>게시 설정</h3><div className="notice-settings-grid"><label>
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
            </div><h3>게시 일정</h3><p className="notice-help">
              게시 시작·종료는 현재 기기의 시간대입니다. 시작 시각 전에는 예약
              상태로 숨겨집니다. 종료 후에는 자동으로 노출이 중단됩니다.
            </p>
            <div className="notice-dates"><div><label>
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
              현재 시각으로 설정
            </button></div>
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
            </div><h3>노출 범위</h3><div className="notice-options">{(["is_pinned", "is_public", "show_app", "show_web"] as const).map(
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
            </div></section><footer className="notice-save"><p className="notice-help">
              삭제 대신 보관을 사용합니다. 수정한 공지는 다시 미읽음으로
              표시됩니다.
            </p>
            <button className="button notice-save-button" type="submit">
              {busy ? "저장 중…" : "공지 저장"}
            </button></footer>
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
          <p role="alert">{current.error}</p>
        ) : (
          <>
            {current.data?.items.length === 0 && <p>등록된 공지사항이 없습니다.</p>}
            <p>전체 {current.data?.total ?? 0}건 · 작성 시각은 한국시간 기준</p>
            <AdminDataTable id="notices" rows={(current.data?.items??[]).map((n,index)=>({...n,sequence:page*20+index+1}))} rowKey={n=>n.notice_id} pageSize={20} scope="현재 서버 페이지(최대 20건) 안에서 검색·정렬합니다. 다른 공지는 아래 이전·다음으로 조회하세요." columns={[
              {key:'sequence',label:'순번',value:n=>n.sequence},
              {key:'title',label:'제목',value:n=>n.title,render:n=><><button className="button button--outline" disabled={busy || uploading} onClick={()=>edit(n)}>{n.title}</button>{n.is_pinned&&' · 고정'}</>},
              {key:'status',label:'상태',value:n=>({published:'게시',draft:'임시저장',archived:'보관'}[n.status])},
              {key:'created',label:'작성 시각 (KST)',value:n=>n.created_at?Date.parse(n.created_at):null,render:n=>formatDateTime(n.created_at)},
              {key:'updated',label:'수정 시각 (KST)',value:n=>Date.parse(n.updated_at),render:n=>formatDateTime(n.updated_at)},
            ]}/>
            <nav className="notice-pagination" aria-label="관리 공지 페이지"><button className="button button--outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              이전
            </button>{" "}
            {page + 1}{" "}
            <button
              className="button button--outline" disabled={(page + 1) * 20 >= (current.data?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button></nav>
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
