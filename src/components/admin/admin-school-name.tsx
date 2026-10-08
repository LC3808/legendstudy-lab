"use client";

import { useEffect, useState } from "react";
import { lookupSchoolName } from "@/lib/admin/school";

/** Reuse APP's public NEIS proxy; send school identifiers only, never a user JWT. */
export function AdminSchoolName({ office, school }: { office: string | null; school: string | null }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; name: string | null } | null>(null);
  const key = JSON.stringify([office, school, attempt]);
  useEffect(() => {
    if (!office || !school) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let active = true;
    async function load() {
      try {
        const name = await lookupSchoolName(office!, school!, controller.signal);
        if (active) setResult({ key, name });
      } catch {
        if (active) setResult({ key, name: null });
      } finally { clearTimeout(timeout); }
    }
    void load();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [office, school, key]);
  if (!office || !school) return <span>{office || school ? "학교 정보 확인 필요" : "미설정"}</span>;
  if (result?.key !== key) return <span>학교명 조회 중…</span>;
  return result.name ? <span>{result.name} <small>(출처: NEIS)</small></span> : <span>학교명 확인 불가 <button type="button" className="text-link" onClick={() => setAttempt((n) => n + 1)}>다시 조회</button></span>;
}
