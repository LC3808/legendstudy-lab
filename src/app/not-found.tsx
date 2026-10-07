import Link from "next/link";
export default function NotFound() {
  return <div className="status-page"><div className="status-page__card"><h1>페이지를 찾을 수 없습니다.</h1><p>주소를 확인하거나 처음으로 돌아가 주세요.</p><Link className="button button--primary" href="/">처음으로</Link></div></div>;
}
