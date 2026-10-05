import Link from "next/link";

import { NotificationCenter } from "@/components/notifications/notification-center";
import { buildPublicMetadata } from "@/lib/brand";

/**
 * The member's notification inbox.
 *
 * Internal: it is not in the sitemap and it is noindex, because it renders
 * personal data and has nothing to say to a crawler. APP shows the same rows
 * through the same backend functions.
 */
export const metadata = buildPublicMetadata(
  "알림",
  "LegendStudy LAB 알림함. 논술 첨삭 완료, Credit 지급과 만료, 결제와 1:1 문의 답변 안내를 확인할 수 있습니다.",
  "/notifications/",
  { index: false },
);

export default function NotificationsPage() {
  return (
    <div className="policy-page content-wrap content-wrap--detail notify-page">
      <p className="eyebrow eyebrow--accent">LEGENDSTUDY LAB / NOTIFICATIONS</p>
      <div className="policy-page__heading">
        <h1>알림</h1>
      </div>
      <p className="policy-page__lead">
        논술 첨삭 완료, Credit 지급과 만료, 결제, 1:1 문의 답변 안내를 확인할 수 있습니다. 읽음 상태는 LegendStudy 앱과
        공유됩니다.
      </p>

      <NotificationCenter />

      <section className="policy-section" aria-labelledby="notify-links">
        <h2 id="notify-links">관련 안내</h2>
        <div className="policy-actions">
          <Link className="button button--outline" href="/my/essays">
            내 논술
          </Link>
          <Link className="button button--outline" href="/account/">
            계정
          </Link>
          <Link className="button button--outline" href="/pricing/">
            요금 안내
          </Link>
          <Link className="button button--outline" href="/support/">
            고객센터
          </Link>
        </div>
      </section>
    </div>
  );
}