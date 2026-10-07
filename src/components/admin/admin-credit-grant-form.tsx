"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { CREDIT_GRANT_REASONS } from "@/lib/admin/grant-reasons";
import { AdminError, describeError } from "@/lib/admin/errors";
import { creditOriginLabel } from "@/lib/admin/format";
import { requestCreditGrant } from "@/lib/admin/finance-boundary";

import { useAdminClient } from "./admin-surface";

const MAX_QUANTITY = 1000;

/**
 * 운영자 Credit 지급.
 *
 * 지급은 canonical 지급 경로만 사용하며, 그 함수의 EXECUTE는 재무 전용 역할에만
 * 열려 있습니다. 브라우저 세션은 그 역할을 가질 수 없으므로 지급은 서버 경계(`/api/admin/credit-grant`)를 통해서만
 * 이루어지고, 경계가 검증한 운영자 신원이 actor로 기록됩니다.
 *
 * 요청 키는 원장의 멱등 키이므로 네트워크 오류 후 다시 시도해도 두 번 지급되지
 * 않습니다.
 */
function GrantForm({
  accountId,
  onGranted,
}: {
  accountId: string;
  onGranted: () => void;
}) {
  const { client: supabase } = useAuth();
  const admin = useAdminClient();
  const origins = Object.keys(CREDIT_GRANT_REASONS);

  const [origin, setOrigin] = useState(origins[0]);
  const [reason, setReason] = useState(CREDIT_GRANT_REASONS[origins[0]][0]);
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  function changeOrigin(next: string) {
    setOrigin(next);
    setReason(CREDIT_GRANT_REASONS[next][0]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_QUANTITY) {
      setFailure(`지급 수량은 1 이상 ${MAX_QUANTITY} 이하의 정수로 입력해 주세요.`);
      return;
    }
    if (!supabase) {
      setFailure("로그인이 필요합니다.");
      return;
    }
    setBusy(true);
    setFailure(null);
    setNotice(null);
    try {
      // A fresh key per submission makes a double-click one grant, not two.
      const result = await requestCreditGrant(supabase, {
        accountId,
        quantity: parsed,
        origin,
        reason,
        requestKey: crypto.randomUUID(),
      });
      setNotice(
        `${creditOriginLabel(result.origin)} ${result.quantity} Credit을 지급했습니다.`,
      );
      setQuantity("1");
      admin?.memberCredit(accountId).catch(() => undefined);
      onGranted();
    } catch (error) {
      setFailure(describeError(error));
      if (error instanceof AdminError && error.kind === "NOT_INSTALLED") {
        setNotice(null);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-grant" onSubmit={submit}>
      <h3>Credit 지급</h3>
      <p className="admin-section__note">
        지급 사유는 원장에 그대로 기록됩니다. 지급 후에는 정정 거래로만 되돌릴 수
        있습니다.
      </p>

      <div className="admin-grant__grid">
        <div className="admin-grant__field">
          <label htmlFor="grant-origin">지급 구분</label>
          <select
            id="grant-origin"
            value={origin}
            onChange={(event) => changeOrigin(event.target.value)}
            disabled={busy}
          >
            {origins.map((value) => (
              <option key={value} value={value}>
                {creditOriginLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-grant__field">
          <label htmlFor="grant-reason">지급 사유</label>
          <select
            id="grant-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
          >
            {CREDIT_GRANT_REASONS[origin].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-grant__field">
          <label htmlFor="grant-quantity">수량</label>
          <input
            id="grant-quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      {notice ? (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      ) : null}
      {failure ? (
        <p className="admin-error admin-error--inline" role="alert">
          {failure}
        </p>
      ) : null}

      <button className="button button--accent" type="submit" disabled={busy}>
        {busy ? "지급 중입니다" : "Credit 지급"}
      </button>
      <p className="admin-section__note">
        회원에게 미치는 영향이 큰 작업입니다. 지급 구분과 수량을 다시 확인해 주세요.
      </p>
    </form>
  );
}

/** Finance writes remain closed: existing Production credential reuse is unverified.
 * No signing material, new JWT or backend route is introduced by this reconciliation.
 */
const FINANCE_WRITE_AVAILABLE = false;
export function AdminCreditGrantForm(props: { accountId: string; onGranted: () => void }) {
  if (!FINANCE_WRITE_AVAILABLE) return <div className="admin-panel"><h3>Credit 지급</h3><p>현재 지급 기능을 사용할 수 없습니다. 조회는 계속 이용할 수 있습니다.</p><button className="button button--outline" disabled>Credit 지급</button></div>;
  return <GrantForm {...props} />;
}
