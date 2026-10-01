import { buildMetadata } from "@/lib/brand";
import { QualityConsole } from "@/components/quality/quality-console";

/**
 * Operator-only Quality Console. Not linked from any public/product navigation
 * and `noindex` (via buildMetadata). Client-side route hiding is only
 * defense-in-depth; the deployed RPC SECURITY DEFINER authorization is the
 * authoritative access boundary.
 */
export const metadata = buildMetadata(
  "Quality Console",
  "LegendStudy LAB 운영자 전용 품질 검토 콘솔입니다.",
);

export default function QualityConsolePage() {
  return <QualityConsole />;
}
