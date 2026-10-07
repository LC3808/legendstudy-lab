import { ScoreLabLanding } from "@/components/score-lab-landing";
import { buildMetadata } from "@/lib/brand";

export const metadata = buildMetadata("내신 LAB", "관심 대학을 기준으로 나의 성적을 살펴보세요.");
export default function Page() { return <ScoreLabLanding />; }
