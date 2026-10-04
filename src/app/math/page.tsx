import { MathStudentRoute } from "@/components/math-release/student-route";
export const metadata = { title: "수리논술 | LegendStudy Plus" };
export default function MathPage() {
  return <MathStudentRoute enabled={process.env.NEXT_PUBLIC_MATH_ENABLED === "true"} />;
}
