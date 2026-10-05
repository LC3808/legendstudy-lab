"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-context";
import {
  INQUIRY_MAX_BODY,
  INQUIRY_MAX_TITLE,
  INQUIRY_MIN_BODY,
  INQUIRY_MIN_TITLE,
  createAdminClient,
  type AdminClient,
} from "@/lib/admin/client";
import { INQUIRY_CATEGORIES, type MyInquiryRow } from "@/lib/admin/contract";
import { describeError } from "@/lib/admin/errors";
import { inquiryCategoryLabel, inquiryStatusLabel } from "@/lib/admin/format";

/**
 * 회원용 1:1 문의.
 *
 * 답변은 운영자가 등록하고, 등록 시점에 가입 이메일로 알림이 발송됩니다. 이 화면은
 * 본인이 제출한 문의의 처리 상태만 보여주며, 답변 본문은 메일로만 전달됩니다.
 */
export function MemberInquiry() {
  const { status, client: supabase } = useAuth();
  const client = useMemo<AdminClient | null>(
    () => (supabase ? createAdminClient(supabase) : null),
    [supabase],
  );

  const [category, setCategory] = useState<string>(INQUIRY_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [mine, setMine] = useState<MyInquiryRow[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !client) return;
    let active = true;
    client.myInquiries().then(
      (rows) => {
        if (active) setMine(rows);
      },
      () => {
        // A failed list must not block submitting a new inquiry.
        if (active) setMine([]);
      },
    );
    return () => {
      active = false;
    };
  }, [status, client, reloadKey]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (cleanTitle.length < INQUIRY_MIN_TITLE) {
      setFailure(`제목은 ${INQUIRY_MIN_TITLE}자 이상 입력해 주세요.`);
      return;
    }
    if (cleanTitle.length > INQUIRY_MAX_TITLE) {
      setFailure(`제목은 ${INQUIRY_MAX_TITLE}자 이내로 입력해 주세요.`);
      return;
    }
    if (cleanBody.length < INQUIRY_MIN_BODY) {
      setFailure(`문의 내용은 ${INQUIRY_MIN_BODY}자 이상 입력해 주세요.`);
      return;
    }
    if (cleanBody.length > INQUIRY_MAX_BODY) {
      setFailure(`문의 내용은 ${INQUIRY_MAX_BODY}자 이내로 입력해 주세요.`);
      return;
    }
    if (!client) {
      setFailure("로그인 후 이용해 주세요.");
      return;
    }
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      // The request key makes a double submission one inquiry, not two.
      const result = await client.submitInquiry({
        category,
        title: cleanTitle,
        body: cleanBody,
        requestKey: crypto.randomUUID(),
      });
      setTitle("");
      setBody("");
      setNotice(
        result.created
          ? "문의가 접수되었습니다. 답변은 가입하신 이메일로 안내드립니다."
          : "이미 접수된 문의입니다. 중복 접수되지 않았습니다.",
      );
      setReloadKey((value) => value + 1);
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <p className="inquiry-state" role="status">
        로그인 상태를 확인하는 중입니다.
      </p>
    );
  }

  if (status !== "authenticated" || !client) {
    return (
      <div className="inquiry-state">
        <p>1:1 문의는 로그인 후 이용할 수 있습니다.</p>
        <p className="inquiry-state__note">
          접수된 문의의 처리 결과는 가입하신 이메일로 안내드립니다.
        </p>
        <Link className="button button--accent" href="/account/">
          로그인하고 문의하기
        </Link>
      </div>
    );
  }

  return (
    <div className="inquiry">
      <form className="inquiry-form" onSubmit={submit}>
        <div className="inquiry-form__field">
          <label htmlFor="inquiry-category">문의 유형</label>
          <select
            id="inquiry-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={busy}
          >
            {INQUIRY_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {inquiryCategoryLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="inquiry-form__field">
          <label htmlFor="inquiry-title">제목</label>
          <input
            id="inquiry-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={INQUIRY_MAX_TITLE}
            placeholder="문의 제목"
            disabled={busy}
          />
        </div>

        <div className="inquiry-form__field">
          <label htmlFor="inquiry-body">문의 내용</label>
          <textarea
            id="inquiry-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            maxLength={INQUIRY_MAX_BODY}
            placeholder="확인에 필요한 내용을 구체적으로 적어 주세요."
            disabled={busy}
          />
          <p className="inquiry-form__hint">
            비밀번호나 결제수단 정보는 적지 마세요. 필요한 경우 운영자가 추가 확인을
            요청드립니다.
          </p>
        </div>

        {notice ? (
          <p className="inquiry-notice" role="status">
            {notice}
          </p>
        ) : null}
        {failure ? (
          <p className="inquiry-error" role="alert">
            {failure}
          </p>
        ) : null}

        <button className="button button--accent" type="submit" disabled={busy}>
          문의 접수
        </button>
      </form>

      <section className="inquiry-history">
        <h2>내 문의 내역</h2>
        {mine === null ? (
          <p className="inquiry-state__note" role="status">
            불러오는 중입니다.
          </p>
        ) : mine.length === 0 ? (
          <p className="inquiry-state__note">아직 접수한 문의가 없습니다.</p>
        ) : (
          <ul className="inquiry-list">
            {mine.map((row) => {
              const badge = inquiryStatusLabel(row.status);
              return (
                <li key={row.inquiryId} className="inquiry-list__item">
                  <p className="inquiry-list__title">{row.title}</p>
                  <p className="inquiry-list__meta">
                    {inquiryCategoryLabel(row.category)} ·{" "}
                    <span className={`admin-tag admin-tag--${badge.tone}`}>{badge.label}</span>
                  </p>
                  {row.answered ? (
                    <p className="inquiry-list__note">
                      답변이 등록되어 안내 메일을 발송했습니다. 메일함을 확인해 주세요.
                    </p>
                  ) : (
                    <p className="inquiry-list__note">
                      확인 후 순차적으로 답변드립니다. 답변은 이메일로 안내됩니다.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="inquiry-state__note">
          답변은 가입하신 이메일로 발송됩니다. 문의 내용에 대한 추가 안내가 필요하면{" "}
          <a href="mailto:support@legendstudy.com">support@legendstudy.com</a>으로 연락해
          주세요.
        </p>
      </section>
    </div>
  );
}
