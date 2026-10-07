'use client';
import { useCallback, useEffect, useState } from 'react';
import { getBrowserAuthClient } from '@/lib/browser-auth-client';

export type CreditSummary = {dto_version:string;spendable:number;paid:number;free:number;other:number;next_expiry:string|null};
export function validCredit(v: CreditSummary) {return v.dto_version==='credit-v1' && [v.spendable,v.paid,v.free,v.other].every(n=>Number.isSafeInteger(n)&&n>=0) && v.spendable===v.paid+v.free+v.other;}

/**
 * What the browser knows about this visitor's Credit.
 *
 * `ready` carries the DTO exactly as `credit_summary()` answered it; nothing here
 * derives, caches or recomputes a balance, so every surface that reads Credit
 * shows the same number.
 */
export type CreditState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'ready'; value: CreditSummary };

/**
 * The single browser-side reader of the canonical `credit_summary()` RPC.
 *
 * The RPC is the only authority for a balance: it is self-scoped and
 * authenticated, so the client never assembles a total from rows and never keeps
 * a second Credit state. Every consumer of Credit on a page — MY, and the 논술 LAB
 * header — shares this hook, which is what keeps those two screens equal.
 *
 * The session is re-read around the RPC call and the auth subscription resets the
 * state, so a sign-out or an account switch can never leave the previous
 * visitor's balance on screen.
 */
export function useCreditSummary(): { state: CreditState; reload: () => void } {
  const [state, setState] = useState<CreditState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const client = getBrowserAuthClient();
    async function load() {
      const session = await client?.auth.getSession();
      const owner = session?.data.session?.user.id;
      if (!owner) { if (active) setState({ status: 'signed-out' }); return; }
      const r = await client!.rpc('credit_summary');
      const current = await client!.auth.getSession();
      if (!active || current.data.session?.user.id !== owner) return;
      if (r.error || !r.data || !validCredit(r.data)) setState({ status: 'error' });
      else setState({ status: 'ready', value: r.data });
    }
    void load();
    const subscription = client?.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      setState({ status: 'loading' });
      setVersion(v => v + 1);
    });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, [version]);
  const reload = useCallback(() => { setState({ status: 'loading' }); setVersion(v => v + 1); }, []);
  return { state, reload };
}

export function CreditBalance() {
  const { state, reload } = useCreditSummary();
  return <section><h2>내 Credit</h2>{state.status === 'ready' && <p>사용 가능 {state.value.spendable} Credits · 구매 {state.value.paid} · 가입 무료 {state.value.free} · 기타 {state.value.other}{state.value.next_expiry && <> · 가장 가까운 만료: {new Date(state.value.next_expiry).toLocaleString('ko-KR')}</>}</p>}{state.status === 'error' && <p>Credit을 확인하지 못했습니다.</p>}<button onClick={reload}>잔액 새로고침</button></section>;
}
