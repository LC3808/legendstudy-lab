"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";

type Receipt = { owner: string; state: string; deadline: string | null };
export function AccountDeletionRequest({ enabled = process.env.NEXT_PUBLIC_ACCOUNT_DELETION_ENABLED === "true" }: { enabled?: boolean }) {
  const { client, user, status, signOut } = useAuth();
  const ownerRef = useRef(user?.id);
  useEffect(() => { ownerRef.current = user?.id; }, [user?.id]);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [confirmedOwner, setConfirmedOwner] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<{ owner: string; message: string } | null>(null);
  async function run(operation: "request" | "status") {
    if (!enabled || !client || !user || busyRef.current) return;
    const owner = user.id;
    busyRef.current = true;
    setBusy(true); setError(null);
    try {
      const { data, error } = await client.functions.invoke("delete-account", {
        body: { operation }, signal: AbortSignal.timeout(15000),
      });
      if (ownerRef.current !== owner) return;
      if (error || !data || !["NORMAL", "DELETION_PENDING", "ERASING", "ERASED", "CANCELLED"].includes(data.state)) throw Error();
      const deadline = data.scheduled_deletion_at;
      if (["DELETION_PENDING", "ERASING"].includes(data.state) && (typeof deadline !== "string" || !Number.isFinite(Date.parse(deadline)))) throw Error();
      if (operation === "request" && !["DELETION_PENDING", "ERASING", "ERASED"].includes(data.state)) throw Error();
      setReceipt({ owner, state: data.state, deadline: typeof deadline === "string" ? deadline : null });
      setConfirmedOwner(null);
    } catch {
      if (ownerRef.current === owner) setError({ owner, message: "요청 결과를 확인하지 못했어요. 상태 확인 후 다시 시도해 주세요." });
    } finally { busyRef.current = false; setBusy(false); }
  }
  if (!enabled) return <p role="status">온라인 삭제 요청은 아직 운영 준비 중입니다. 현재 이 페이지에서는 요청을 접수하지 않습니다.</p>;
  if (status === "loading") return <p>로그인 상태를 확인하고 있어요.</p>;
  if (!user || !client) return <p>삭제할 LegendStudy Plus 계정으로 <Link href="/login/">로그인</Link>한 뒤 이 페이지로 돌아와 주세요.</p>;
  const current = receipt?.owner === user.id ? receipt : null;
  return <section aria-label="계정 삭제 요청">
    <p>본인의 로그인된 계정에만 요청됩니다. 요청 즉시 개인화 이용이 제한되며, 14일(336시간) 뒤 개인정보 파기가 진행됩니다. 로그인만으로 취소되지 않습니다.</p>
    <label><input type="checkbox" disabled={busy} checked={confirmedOwner === user.id} onChange={(e) => setConfirmedOwner(e.target.checked ? user.id : null)} /> 삭제 일정과 이용 제한을 이해했습니다.</label>
    <div className="policy-actions">
      <button className="button button--primary" disabled={busy || confirmedOwner !== user.id || current?.state === "ERASED" || current?.state === "ERASING" || current?.state === "DELETION_PENDING"} onClick={() => void run("request")}>계정 삭제 요청</button>
      <button className="button button--outline" disabled={busy} onClick={() => void run("status")}>상태 확인</button>
      <button className="button button--outline" disabled={busy} onClick={() => void signOut().catch(() => setError({ owner: user.id, message: "로그아웃하지 못했어요. 다시 시도해 주세요." }))}>로그아웃</button>
    </div>
    {busy && <p role="status">처리 중입니다.</p>}
    {current && <p role="status">{current.state === "DELETION_PENDING" ? "삭제 요청이 접수됐습니다." : current.state === "ERASING" ? "개인정보 파기 중입니다." : current.state === "ERASED" ? "개인정보 파기가 확인됐습니다." : "진행 중인 삭제 요청이 없습니다."}{current.deadline && ` 파기 예정 시각: ${new Date(current.deadline).toLocaleString("ko-KR")}`}</p>}
    {error?.owner === user.id && <p role="alert">{error.message}</p>}
  </section>;
}
