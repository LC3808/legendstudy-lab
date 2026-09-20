import { publicUrl } from "@/lib/brand";
import type { UniversityPublicMetadata } from "@/types/domain";

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function UniversityStructuredData({ university }: { university: UniversityPublicMetadata }) {
  const url = publicUrl(`/essay-lab/universities/${university.id}`);
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${university.universityName} ${university.admissionYear} 논술 정보`,
    description: university.sourceNote,
    url,
    about: {
      "@type": "CollegeOrUniversity",
      name: university.universityName,
      url: university.officialAdmissionsUrl,
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(payload) }} />;
}
