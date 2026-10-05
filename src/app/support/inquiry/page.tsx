import Link from "next/link";

import { MemberInquiry } from "@/components/support/member-inquiry";
import { buildPublicMetadata } from "@/lib/brand";

export const metadata = buildPublicMetadata(
  "1:1 문의",
  "LegendStudy LAB 1:1 문의. 서비스 이용, 결제·환불, 계정, 개인정보 관련 문의를 접수하고 처리 결과를 이메일로 안내드립니다.",
  "/support/inquiry/",
);

export default function SupportInquiryPage() {
  return (
    <div className="policy-page content-wrap">
      <header className="policy-page__heading">
        <p className="eyebrow eyebrow--accent">고객센터</p>
        <h1>1:1 문의</h1>
        <p className="policy-page__lead">
          로그인한 계정으로 문의를 접수하면, 확인 후 처리 결과를 가입하신 이메일로
          안내드립니다.
        </p>
      </header>

      <section className="policy-section">
        <MemberInquiry />
      </section>

      <section className="policy-section">
        <h2>문의 접수 처리 절차</h2>
        <p className="policy-process">
          문의 접수 → 내용 확인 → 안내 및 처리
        </p>
        <p>
          접수된 문의는 가입 계정과 필요한 내용을 확인한 후 처리 결과 또는 필요한 조치를
          안내합니다. 결제·환불 관련 문의도 같은 절차로 접수되며, 환불 기준은{" "}
          <Link href="/refund/">환불정책</Link>을 따릅니다.
        </p>
      </section>

      <section className="policy-section">
        <h2>기타 안내</h2>
        <ul className="policy-list">
          <li>
            <Link href="/pricing/">요금 안내</Link>
          </li>
          <li>
            <Link href="/refund/">환불정책</Link>
          </li>
          <li>
            <Link href="/terms/">이용약관</Link>
          </li>
          <li>
            <Link href="/privacy/">개인정보처리방침</Link>
          </li>
          <li>
            <Link href="/account-deletion/">계정 삭제 안내</Link>
          </li>
          <li>
            <Link href="/support/">고객센터</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
