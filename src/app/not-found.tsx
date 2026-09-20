import Link from "next/link";

export default function NotFound() {
  return <div className="status-page"><div className="status-page__card"><p className="eyebrow eyebrow--accent">NOT FOUND</p><h1>요청한 자료를 찾을 수 없습니다.</h1><p>이 Phase 2 foundation은 소수의 reviewed public fixture와 합성 연습 package만 제공합니다. URL을 다시 확인하거나 Essay Lab 목록으로 돌아가세요.</p><Link className="button button--primary" href="/essay-lab">Essay Lab으로 돌아가기 <span aria-hidden="true">→</span></Link></div></div>;
}
