import Link from "next/link";

import { MockNotice } from "@/components/trust-label";
import { buildMetadata } from "@/lib/brand";

export const metadata = buildMetadata("로그인", "Shared Auth integration pending 상태를 명확히 알리는 LS LAB login shell입니다.");

export default function LoginPage() {
  return <div className="login-page content-wrap"><div className="login-page__card"><p className="eyebrow eyebrow--accent">ACCOUNT / FUTURE INTEGRATION</p><h1>로그인은<br />다음 연결 단계입니다.</h1><p>LS LAB은 장기적으로 LegendStudy 계정과 답안 이력·평가 기록을 안전하게 연결할 수 있어야 합니다. Phase 2는 계정 생성, 로그인, Supabase Auth, credit, 개인 데이터 저장을 수행하지 않습니다.</p><div className="pending-auth"><strong>AUTH INTEGRATION PENDING</strong><p>기존 Supabase 사용자 ID와 Web 세션의 매핑, redirect, account linking/unlinking, retention, deletion을 Product Owner와 보안 검토 후 정의해야 합니다.</p></div><MockNotice compact /><Link className="button button--primary" href="/essay-lab">로그인 없이 탐색하기 <span aria-hidden="true">→</span></Link></div></div>;
}
