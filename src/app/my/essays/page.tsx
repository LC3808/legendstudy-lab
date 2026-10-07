import { PersonalEntry } from "@/components/personal-entry";
import { buildMetadata } from "@/lib/brand";
export const metadata = buildMetadata("나의 논술 기록", "내 계정에서 학습 기록을 확인하세요.");
export default function Page() {
  return <div className="placeholder-page content-wrap"><h1>나의 논술 기록</h1><p>이 화면에서는 아직 기록을 조회할 수 없습니다.</p><div className="button-row"><PersonalEntry className="button button--primary">내 계정 보기</PersonalEntry></div></div>;
}
