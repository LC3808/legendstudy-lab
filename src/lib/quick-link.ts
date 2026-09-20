import type { EssaySourceLink } from "@/types/domain";

export type ResolvedOfficialLink = {
  href?: string;
  actionLabel: string;
  helperText: string;
  isExternal: boolean;
  requiresRecheck: boolean;
};

/**
 * Resolves a public navigation target only. It must never download, parse,
 * proxy, cache, or treat a link as source-use permission.
 */
export function resolveOfficialLink(link: EssaySourceLink): ResolvedOfficialLink {
  const canonical = link.canonicalNoticeUrl;
  const direct = link.directAttachmentUrl;
  const isUnstable = link.availability === "UNSTABLE" || link.quality === "UNSTABLE_SESSION_LINK";
  const isBroken = link.availability === "BROKEN" || link.quality === "BROKEN";

  if (isBroken) {
    return {
      href: canonical,
      actionLabel: canonical ? "공식 입학처에서 다시 확인" : "공식 자료 링크를 확인 중입니다",
      helperText: canonical ? "기록된 직접 링크는 제공하지 않습니다. 공식 페이지에서 최신 자료를 확인하세요." : "공식 자료 링크를 확인 중입니다.",
      isExternal: Boolean(canonical),
      requiresRecheck: true,
    };
  }

  if (isUnstable) {
    return {
      href: canonical,
      actionLabel: canonical ? "공식 자료실에서 확인" : "공식 자료 링크를 확인 중입니다",
      helperText: "세션 또는 변경 가능성이 있는 직접 파일 링크 대신 공식 자료실을 안내합니다.",
      isExternal: Boolean(canonical),
      requiresRecheck: true,
    };
  }

  if (canonical) {
    return {
      href: canonical,
      actionLabel: "공식 기출문제 확인",
      helperText: link.availability === "REVIEW_REQUIRED" ? "최종 지원 전 입학처의 최신 안내를 다시 확인하세요." : "공식 입학처 페이지로 이동합니다.",
      isExternal: true,
      requiresRecheck: link.availability === "REVIEW_REQUIRED",
    };
  }

  if (direct && link.availability === "AVAILABLE" && link.quality === "DIRECT_OFFICIAL_FILE") {
    return {
      href: direct,
      actionLabel: "공식 문서 열기",
      helperText: "공개 direct file은 연결 상태를 다시 확인한 뒤 제공됩니다.",
      isExternal: true,
      requiresRecheck: true,
    };
  }

  return {
    actionLabel: "공식 자료 링크를 확인 중입니다",
    helperText: "현재 이 foundation에서는 안정적인 공식 자료실 링크를 제공하지 않습니다.",
    isExternal: false,
    requiresRecheck: true,
  };
}
