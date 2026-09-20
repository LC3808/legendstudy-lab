import { describe, expect, it } from "vitest";

import { resolveOfficialLink } from "./quick-link";
import type { EssaySourceLink } from "@/types/domain";

const canonicalLink: EssaySourceLink = {
  id: "official-notice",
  label: "Official notice",
  canonicalNoticeUrl: "https://admissions.example.edu/notice/1",
  quality: "OFFICIAL_NOTICE_WITH_ATTACHMENT",
  availability: "REVIEW_REQUIRED",
  checkedDate: "2026-09-18",
  origin: "OFFICIAL_SOURCE",
};

describe("official Quick Link resolver", () => {
  it("uses the canonical notice as the primary public navigation target", () => {
    const resolved = resolveOfficialLink(canonicalLink);
    expect(resolved.href).toBe(canonicalLink.canonicalNoticeUrl);
    expect(resolved.actionLabel).toBe("공식 기출문제 확인");
    expect(resolved.requiresRecheck).toBe(true);
  });

  it("falls back to canonical notice instead of an unstable direct attachment", () => {
    const resolved = resolveOfficialLink({
      ...canonicalLink,
      directAttachmentUrl: "https://admissions.example.edu/file.pdf?session=volatile",
      quality: "UNSTABLE_SESSION_LINK",
      availability: "UNSTABLE",
    });
    expect(resolved.href).toBe(canonicalLink.canonicalNoticeUrl);
    expect(resolved.actionLabel).toBe("공식 자료실에서 확인");
  });

  it("does not expose a direct file unless it is explicitly available and stable", () => {
    const resolved = resolveOfficialLink({
      ...canonicalLink,
      canonicalNoticeUrl: undefined,
      directAttachmentUrl: "https://admissions.example.edu/file.pdf",
      quality: "DIRECT_OFFICIAL_FILE",
      availability: "AVAILABLE",
    });
    expect(resolved.href).toBe("https://admissions.example.edu/file.pdf");
    expect(resolved.actionLabel).toBe("공식 문서 열기");
  });

  it("avoids a broken direct file and surfaces a recheck state", () => {
    const resolved = resolveOfficialLink({
      ...canonicalLink,
      quality: "BROKEN",
      availability: "BROKEN",
    });
    expect(resolved.href).toBe(canonicalLink.canonicalNoticeUrl);
    expect(resolved.actionLabel).toBe("공식 입학처에서 다시 확인");
  });
});
