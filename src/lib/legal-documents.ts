/**
 * LegendStudy LAB — public legal document content.
 *
 * The terms and the privacy policy are rendered from this module so that every
 * number, period and contact address matches `pricing.ts` and `business-info.ts`
 * instead of being retyped per page.
 *
 * Both documents describe the service as it actually runs today. They are
 * consumer-facing pages, so they must not carry internal build vocabulary
 * (review markers, pending-value markers, unresolved-status markers and the
 * like), architecture detail, or a development roadmap.
 * `scripts/verify-boundaries.mjs` enforces that. Anything that still needs a
 * review before it can be stated belongs in `business-info.ts`
 * (`privacyActivationGates`) and in `docs/TOSS_REVIEW_1_PUBLICATION.md`.
 *
 * The privacy policy lists only the external services that process data today.
 * Toss Payments, Generative-AI providers, AdMob, GA4, Sentry/Crashlytics and the
 * Math private storage are NOT listed, because none of them is active yet.
 */

import {
  businessInfo,
  customerCenter,
  privacyOfficer,
  productNaming,
} from "@/lib/business-info";
import { pricingPlans, pricingPolicy } from "@/lib/pricing";

export type LegalBlock =
  | { readonly kind: "heading"; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "items"; readonly items: readonly string[] }
  | { readonly kind: "definitions"; readonly entries: readonly { readonly term: string; readonly description: string }[] };

export type LegalDocument = {
  readonly id: "terms" | "privacy";
  readonly eyebrow: string;
  readonly heading: string;
  readonly metadataTitle: string;
  readonly summary: string;
  readonly blocks: readonly LegalBlock[];
};

/**
 * Single source of truth for the 시행일 (effective date) of BOTH published
 * policies.
 *
 * The Owner publishes the terms and the privacy policy on the Production
 * publication date, so neither document writes its own date. Set `iso` to that
 * date (`YYYY-MM-DD`) once, immediately before the merge to `main`, and both
 * documents render it everywhere they state an effective date.
 *
 * While it is `null` the documents state that they take effect from the date
 * they are published. That is accurate, and it keeps the public pages free of
 * any developer placeholder (a TODO/TBD marker on a policy page is itself a
 * publication defect).
 *
 * OWNER CLOSEOUT ITEM: set the real date before the Production merge.
 */
export const policyEffectiveDateIso: string | null = "2026-10-03";

/** Human-readable 시행일 for the public pages. */
export function effectiveDateLabel(): string {
  if (!policyEffectiveDateIso) return "본 문서를 공개한 날";
  const [year, month, day] = policyEffectiveDateIso.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

const priceLine = pricingPlans.map((plan) => `${plan.credits} Credits ${plan.priceLabel}`).join(", ");
const creditOptions = pricingPlans.map((plan) => plan.credits).join(", ");
const fullPrice = `${pricingPolicy.refundDeductionPerCreditKrw.toLocaleString("ko-KR")}원`;

const supportParagraph =
  `문의는 ${customerCenter.displayName}로 접수합니다. 고객지원·결제·환불 문의는 ${customerCenter.primary.display}, 일반·제휴 문의는 ${customerCenter.secondary.display}이며, 전화 문의는 ${customerCenter.phone.display}입니다.`;

const minorPaymentClause = [
  "논술 첨삭 서비스는 고등학생을 포함한 이용자를 대상으로 합니다.",
  "미성년자가 유료 서비스를 구매하는 경우 법정대리인의 동의가 필요할 수 있습니다.",
  "법정대리인의 동의 없이 체결한 계약은 관계 법령에 따라 미성년자 본인 또는 법정대리인이 취소할 수 있습니다.",
  "다만 법정대리인이 처분을 허락한 재산의 범위에서 이루어진 결제 등 관계 법령에 따라 취소가 제한되는 경우가 있습니다.",
  "일반적인 결제 취소와 환불에는 회사의 환불정책이 적용되며, 미성년자 계약의 취소 등 관계 법령에서 별도로 정한 사항이 있는 경우에는 해당 법령에 따릅니다.",
  `보호자는 ${customerCenter.displayName}를 통해 자녀의 이용에 관한 문의를 할 수 있습니다.`,
];

export const termsDocument: LegalDocument = {
  id: "terms",
  eyebrow: "LEGENDSTUDY LAB / TERMS",
  heading: "이용약관",
  metadataTitle: "LegendStudy 이용약관",
  summary: `${businessInfo.legalName}가 제공하는 LegendStudy LAB 논술 첨삭 상품의 이용 조건을 정합니다.`,
  blocks: [
    {
      kind: "paragraph",
      text: `이 약관은 ${businessInfo.legalName}(이하 "회사")가 운영하는 LegendStudy LAB 서비스와 그 안에서 판매하는 논술 첨삭 상품의 이용에 관해 회사와 이용자 사이의 권리와 의무를 정합니다.`,
    },
    {
      kind: "paragraph",
      text:
        "legendstudy.com과 레전드스터디+ 앱은 LegendStudy LAB과 별개의 서비스입니다. 이 약관이 정하는 유료 상품은 LegendStudy LAB 안의 논술 첨삭 상품입니다.",
    },
    {
      kind: "paragraph",
      text: "이 약관과 함께 개인정보처리방침과 환불정책이 적용됩니다. 환불에 관해서는 환불정책이 이 약관보다 우선합니다.",
    },

    { kind: "heading", text: "제1조 목적과 적용 범위" },
    {
      kind: "items",
      items: [
        `LegendStudy LAB은 내신 학습, 모의고사·수능, 논술 등 여러 학습 영역을 다루는 플랫폼입니다. 이 약관에서 정하는 유료 상품은 그중 논술 첨삭 서비스(${productNaming.essayProduct})입니다.`,
        "이 약관은 회사가 제공하는 LegendStudy LAB 서비스와 그 유료 상품의 이용에 적용됩니다.",
        "이용자가 이 약관에 동의하지 않는 경우 유료 상품을 구매하거나 논술 첨삭 서비스를 이용할 수 없습니다.",
      ],
    },

    { kind: "heading", text: "제2조 서비스의 내용" },
    {
      kind: "items",
      items: [
        "이용자는 논술 문제를 선택하고 제한 시간과 분량에 맞춰 답안을 제출한 뒤, 첨삭 결과와 핵심 개선점을 확인할 수 있습니다.",
        "이용자는 첨삭 결과를 확인한 뒤 답안을 다시 작성해 제출할 수 있고, 이 경우 동일 답안에 대해 재첨삭을 1회 받을 수 있습니다.",
        "화면 구성, 다루는 문제의 범위, 첨삭 결과의 형식은 서비스 개선에 따라 변경될 수 있습니다.",
      ],
    },

    { kind: "heading", text: "제3조 회원 계정" },
    {
      kind: "items",
      items: [
        "이용자는 이메일과 비밀번호로 가입하거나 Google, Apple, Kakao 계정으로 로그인할 수 있습니다.",
        "소셜 로그인을 사용하는 경우 해당 제공자가 확인한 계정 식별자와 이메일 주소를 전달받습니다. Kakao 로그인은 이메일 항목만 요청하며 닉네임과 프로필 이미지는 요청하지 않습니다.",
        "회사는 같은 계정으로 LegendStudy LAB과 LegendStudy 앱을 이용할 수 있도록 동일한 계정 체계를 사용합니다.",
        "이용자는 자신의 계정 정보를 관리해야 하며, 비밀번호를 제3자에게 제공해서는 안 됩니다.",
        `계정 삭제는 ${customerCenter.displayName}를 통해 요청할 수 있으며, 현재 준비 상태와 처리 절차는 계정 삭제 안내 페이지에서 확인할 수 있습니다.`,
      ],
    },

    { kind: "heading", text: "제4조 Credit의 정의와 성격" },
    {
      kind: "items",
      items: [
        `Credit은 ${productNaming.essayProduct}에서 논술 첨삭을 이용하기 위한 이용 단위입니다.`,
        "Credit은 현금, 전자화폐, 범용 포인트가 아니고 환금성 포인트가 아니며, 현금으로 교환할 수 없습니다.",
        "Credit은 다른 이용자에게 양도할 수 없고 LegendStudy LAB의 다른 학습 영역이나 회사의 다른 서비스에서는 사용할 수 없습니다.",
        "사용한 Credit은 환불되지 않습니다.",
      ],
    },

    { kind: "heading", text: "제5조 유료 Credit의 이용기간과 재첨삭" },
    {
      kind: "items",
      items: [
        `구매한 Credit은 결제일로부터 ${pricingPolicy.paidCreditValidityMonths}개월 동안 사용할 수 있습니다.`,
        "1 Credit으로 최초 첨삭과 답안 수정 후 재첨삭 1회까지 이용할 수 있습니다.",
        `재첨삭은 최초 첨삭 결과 제공일로부터 ${pricingPolicy.reevaluationWindowDays}일 이내에 1회 제공되며, 추가로 Credit이 차감되지 않습니다.`,
        "재첨삭 이용 기간은 Credit 유효기간과 별개로 계산합니다.",
        "유효기간이 지난 Credit은 사용할 수 없습니다.",
      ],
    },

    { kind: "heading", text: "제6조 신규 가입 무료 Credit" },
    {
      kind: "items",
      items: [
        `신규 가입 시 ${pricingPolicy.freeSignupCredits} Credits를 무료로 제공하며, 지급 기능의 공개 시점은 요금 안내 페이지에서 안내합니다.`,
        "무료로 지급된 Credit은 유효기간이 없고 현금으로 환불되지 않습니다.",
        `무료 Credit으로 받은 최초 첨삭의 재첨삭도 최초 첨삭 결과 제공일로부터 ${pricingPolicy.reevaluationWindowDays}일 이내에 이용할 수 있습니다.`,
      ],
    },

    { kind: "heading", text: "제7조 결제" },
    {
      kind: "items",
      items: [
        `유료 상품은 ${creditOptions} Credits로 판매하며, 가격은 ${priceLine}입니다.`,
        "결제는 일회성 구매이며 정기 결제나 자동 갱신 결제가 없습니다.",
        "결제 기능은 아직 제공되지 않습니다. 결제가 시작되면 결제수단, 결제 확인 절차와 영수증 안내를 이 약관과 요금 안내 페이지에 반영합니다.",
        "회사는 카드번호 등 결제수단 정보를 직접 저장하지 않습니다.",
        "가격을 변경하는 경우 적용 시점과 대상을 미리 안내합니다.",
      ],
    },

    { kind: "heading", text: "제8조 취소와 환불" },
    {
      kind: "items",
      items: [
        "환불 신청 기간, 미사용·일부 사용 환불 산식, 사용한 Credit 판정 기준과 환불 처리 기간은 환불정책에서 정합니다.",
        "미사용 Credit은 실제 결제금액을 전액 환불합니다.",
        `일부 사용한 경우 사용한 Credit을 1 Credit 정상가 ${fullPrice} 기준으로 공제한 뒤 남은 결제금액을 환불합니다.`,
        "무료로 지급된 Credit은 현금으로 환불되지 않습니다.",
        `환불 요청은 ${customerCenter.displayName}(${customerCenter.primary.display})로 접수합니다.`,
      ],
    },

    { kind: "heading", text: "제9조 관계 법령에 따른 소비자의 권리" },
    {
      kind: "paragraph",
      text:
        "회사의 환불정책은 일반적인 결제 취소와 환불에 적용됩니다. 관계 법령에서 청약철회, 계약 취소, 계약의 해제·해지 또는 환급에 관한 별도의 권리를 인정하는 경우에는 해당 법령이 적용됩니다. 이 약관과 환불정책은 관계 법령에 따른 소비자의 권리를 제한하지 않습니다.",
    },

    { kind: "heading", text: "제10조 미성년자 이용과 결제" },
    { kind: "items", items: minorPaymentClause },

    { kind: "heading", text: "제11조 서비스의 제공과 변경·중단" },
    {
      kind: "items",
      items: [
        "회사는 서비스의 내용을 변경하거나 제공을 중단할 수 있으며, 이용자에게 중요한 영향을 주는 경우 미리 안내합니다.",
        "유료 상품을 판매한 뒤 서비스를 종료하는 경우 남은 유료 Credit은 관련 법령과 환불정책에 따라 처리합니다.",
      ],
    },

    { kind: "heading", text: "제12조 서비스 장애와 결과 미제공" },
    {
      kind: "items",
      items: [
        "제공자 장애, 처리 오류, 유효하지 않은 결과 등으로 정상적인 첨삭 결과가 제공되지 않은 경우에는 그 Credit을 사용한 것으로 보지 않습니다.",
        `이용자는 ${customerCenter.displayName}를 통해 오류를 신고할 수 있고, 회사는 확인 후 재처리 또는 환불 등 필요한 조치를 안내합니다.`,
      ],
    },

    { kind: "heading", text: "제13조 이용자의 의무와 금지 행위" },
    {
      kind: "items",
      items: [
        "타인의 계정을 사용하거나 계정 정보를 도용하는 행위",
        "서비스에서 제공되는 문제와 첨삭 결과를 회사의 허락 없이 복제·배포·판매하는 행위",
        "자동화된 수단으로 서비스에 접근하거나 서비스 운영을 방해하는 행위",
        "법령이나 공공질서에 위반되는 내용을 제출하는 행위",
      ],
    },

    { kind: "heading", text: "제14조 지식재산권과 외부 출처" },
    {
      kind: "items",
      items: [
        "서비스 화면, 첨삭 결과의 형식과 서비스 운영에 사용되는 자료에 관한 권리는 회사 또는 정당한 권리자에게 있습니다.",
        "이용자가 작성해 제출한 답안의 권리는 이용자에게 있으며, 회사는 서비스 제공과 품질 개선에 필요한 범위에서 이를 이용합니다.",
        "대학·기관의 공개 페이지나 파일로 연결되는 정보는 원문 출처를 확인하기 위한 것이며, 해당 자료를 복제·저장·재배포할 권한을 뜻하지 않습니다.",
      ],
    },

    { kind: "heading", text: "제15조 회사의 책임" },
    {
      kind: "items",
      items: [
        "회사는 통신 장애, 호스팅·인증 등 외부 서비스 제공자의 장애, 천재지변 등 회사가 합리적으로 통제하기 어려운 사유로 서비스를 제공하지 못한 경우에는 그 책임을 지지 않습니다.",
        "첨삭 결과는 학습을 돕기 위한 참고 자료이며, 특정 성적이나 평가 결과를 보장하지 않습니다.",
        "회사는 고의 또는 중대한 과실이 없는 한 간접손해나 특별손해에 대해 책임을 지지 않습니다.",
        "이 조는 관계 법령에 따라 회사의 책임을 제한할 수 없는 경우에는 그 범위에서 적용되지 않습니다.",
      ],
    },

    { kind: "heading", text: "제16조 개인정보 보호" },
    {
      kind: "paragraph",
      text:
        "회사는 개인정보처리방침에 따라 이용자의 개인정보를 처리합니다. 처리 목적과 항목, 보유기간, 외부 서비스 이용과 국외 처리, 이용자의 권리는 개인정보처리방침에서 확인할 수 있습니다.",
    },

    { kind: "heading", text: "제17조 문의와 고객센터" },
    { kind: "paragraph", text: supportParagraph },

    { kind: "heading", text: "제18조 약관의 변경" },
    {
      kind: "items",
      items: [
        "회사는 약관을 변경할 수 있으며, 변경하는 경우 적용 시점과 변경 내용을 이 웹사이트에 안내합니다.",
        "이용자에게 불리한 변경은 합리적인 기간을 두고 미리 안내합니다.",
      ],
    },

    { kind: "heading", text: "제19조 준거법과 분쟁 해결" },
    {
      kind: "items",
      items: [
        "이 약관은 대한민국 법률에 따릅니다.",
        "회사와 이용자 사이에 분쟁이 발생한 경우 상호 협의로 해결하고, 협의가 어려운 경우 관련 법령이 정한 절차에 따릅니다.",
      ],
    },

    { kind: "heading", text: "제20조 시행일" },
    { kind: "paragraph", text: `본 약관은 ${effectiveDateLabel()}부터 시행합니다.` },
  ],
};

export const privacyDocument: LegalDocument = {
  id: "privacy",
  eyebrow: "LEGENDSTUDY LAB / PRIVACY",
  heading: "개인정보처리방침",
  metadataTitle: "LegendStudy 개인정보처리방침",
  summary: `${businessInfo.legalName}가 LegendStudy LAB에서 처리하는 개인정보의 항목, 목적, 보유기간과 이용자의 권리를 안내합니다.`,
  blocks: [
    {
      kind: "paragraph",
      text: `${businessInfo.legalName}(이하 "회사")는 LegendStudy LAB 서비스를 제공하면서 처리하는 개인정보를 다음과 같이 안내합니다. 이 방침은 현재 실제로 제공하는 기능과 처리하는 정보를 기준으로 작성했습니다.`,
    },

    { kind: "heading", text: "제1조 개인정보의 처리 목적" },
    {
      kind: "items",
      items: [
        "회원 가입, 로그인과 계정 관리",
        "LegendStudy LAB 서비스 제공과 이용 상태 관리",
        "논술 첨삭 서비스 제공",
        "고객 문의 접수와 처리",
        "서비스 안정성 확보와 오류 대응",
        "결제 기능을 도입한 이후의 결제와 환불 처리",
      ],
    },

    { kind: "heading", text: "제2조 처리하는 개인정보 항목" },
    {
      kind: "definitions",
      entries: [
        {
          term: "이메일로 가입하는 경우",
          description:
            "이메일 주소와 비밀번호를 처리합니다. 비밀번호는 인증 서비스에서 복호화할 수 없는 형태로 처리되며 회사가 평문으로 보관하지 않습니다.",
        },
        {
          term: "소셜 로그인을 사용하는 경우",
          description:
            "Google, Apple, Kakao가 전달하는 계정 식별자와 이메일 주소를 처리합니다. Kakao 로그인은 이메일 항목만 요청하며 닉네임과 프로필 이미지는 요청하지 않습니다.",
        },
        {
          term: "계정 식별 정보",
          description: "서비스 제공을 위해 회사가 생성·보관하는 계정 식별자입니다.",
        },
        {
          term: "고객 문의",
          description: "이용자가 문의 과정에서 직접 제공하는 내용과 회신을 위한 연락처입니다.",
        },
        {
          term: "접속 기록",
          description:
            "웹사이트 제공과 보안을 위해 호스팅 사업자가 생성하는 접속 기록(접속 시각, 요청 주소, 브라우저 정보 등)이 처리될 수 있습니다.",
        },
      ],
    },
    {
      kind: "paragraph",
      text:
        "회사는 생년월일, 주민등록번호, 학생부나 공식 성적표, 보호자 정보를 수집하지 않습니다. 이용자가 작성해 제출한 논술·수리 답안과 첨삭 결과, 프로필에 입력한 성적·학교·학년 정보는 서비스 제공을 위해 회사의 서버에 저장됩니다. 작성 중인 답안 초안은 제출 전까지 이용자의 브라우저에만 임시로 저장됩니다. 저장된 학습 데이터는 서비스 제공과 품질 개선·분석을 위해 적절히 비식별화하여 활용될 수 있습니다.",
    },
    {
      kind: "paragraph",
      text:
        "회사는 Google, Apple, Kakao의 비밀번호를 수집하거나 보관하지 않습니다. 소셜 로그인 인증은 각 제공자의 화면에서 이루어집니다.",
    },
    {
      kind: "paragraph",
      text:
        "결제 기능이 도입되면 결제대행사가 결제 정보를 처리하며, 회사는 카드번호 등 결제수단 정보를 직접 저장하지 않습니다.",
    },

    { kind: "heading", text: "제3조 개인정보의 보유 및 이용기간" },
    {
      kind: "definitions",
      entries: [
        { term: "계정 정보", description: "회원 탈퇴 시까지 보유합니다." },
        {
          term: "Credit",
          description: `무료로 지급된 Credit은 유효기간이 없고, 유료 Credit은 결제일로부터 ${pricingPolicy.paidCreditValidityMonths}개월 동안 사용할 수 있습니다.`,
        },
        {
          term: "고객 문의 기록",
          description:
            "처리 완료 후 3년간 보존합니다(전자상거래 등에서의 소비자 보호에 관한 법률에 따른 소비자 불만·분쟁처리 기록).",
        },
        {
          term: "계약과 대금결제 기록",
          description:
            "결제 기능을 도입한 이후 발생하는 기록은 관련 법령에 따라 5년간 보존합니다(계약 또는 청약철회 등에 관한 기록, 대금결제 및 재화 등의 공급에 관한 기록).",
        },
        { term: "접속 기록", description: "호스팅 사업자의 보존 정책에 따릅니다." },
      ],
    },

    { kind: "heading", text: "제4조 개인정보의 파기 절차와 방법" },
    {
      kind: "items",
      items: [
        "보유기간이 끝나거나 처리 목적이 달성되면 지체 없이 파기합니다.",
        "전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제합니다.",
        "법령에 따라 보존해야 하는 기록은 다른 정보와 분리해 해당 기간 동안 보존한 뒤 파기합니다.",
      ],
    },

    { kind: "heading", text: "제5조 개인정보의 제3자 제공" },
    {
      kind: "items",
      items: [
        "회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다.",
        "법령에 따라 요구되거나 이용자가 별도로 동의한 경우에만 제공하며, 이 경우 제공하는 항목과 목적을 미리 안내합니다.",
      ],
    },

    { kind: "heading", text: "제6조 외부 서비스 이용과 개인정보 처리위탁" },
    {
      kind: "paragraph",
      text:
        "회사는 서비스 제공에 필요한 범위에서 아래 외부 서비스를 이용하며, 그 업무의 일부를 위탁합니다. 위탁받은 사업자는 맡은 업무의 목적 범위에서만 개인정보를 처리합니다.",
    },
    {
      kind: "definitions",
      entries: [
        {
          term: "Supabase Inc. — 회원 인증과 서비스 데이터 저장",
          description:
            "회원 인증과 서비스 데이터의 저장·처리를 맡습니다. LegendStudy의 Primary Database는 대한민국 서울 리전(ap-northeast-2)에 있습니다.",
        },
        {
          term: "Cloudflare, Inc. — 웹사이트 호스팅과 전송",
          description:
            "LegendStudy LAB 웹사이트의 호스팅과 전송을 맡고, Kakao 로그인 토큰 교환 처리를 수행합니다.",
        },
        {
          term: "Google LLC — 고객지원 이메일과 Google 로그인",
          description:
            "고객센터 이메일의 수신과 회신(Google Workspace)에 사용하고, Google 계정 로그인 인증에 사용합니다.",
        },
        {
          term: "Apple Inc. — Apple 로그인",
          description: "Apple 계정 로그인 인증에 사용합니다.",
        },
        {
          term: "Kakao Corp. — Kakao 로그인",
          description: "Kakao 계정 로그인 인증에 사용합니다.",
        },
        {
          term: "Resend — 문의 알림 메일 발송",
          description:
            "앱에서 접수된 문의의 알림 메일 발송에 사용합니다. 문의 내용과 문의 처리에 필요한 운영 정보가 메일로 전달됩니다.",
        },
      ],
    },

    { kind: "heading", text: "제7조 국외 처리·이전" },
    {
      kind: "paragraph",
      text:
        "회원 인증과 서비스 데이터를 저장하는 Primary Database는 대한민국 서울 리전에 있습니다. 그 밖의 외부 서비스는 업무 수행 과정에서 국외에서 정보를 처리할 수 있으며, 그 범위는 다음과 같습니다.",
    },
    {
      kind: "definitions",
      entries: [
        {
          term: "이전되는 항목",
          description: "제2조의 계정 정보와 접속 기록, 문의 내용 등 해당 업무에 필요한 정보입니다.",
        },
        {
          term: "이전되는 국가",
          description:
            "Cloudflare, Google, Apple, Resend의 서비스는 국외에서 처리될 수 있습니다. Supabase의 Primary Database는 대한민국에 있고, Kakao의 인증 처리는 국내에서 이루어집니다.",
        },
        {
          term: "이전 시기와 방법",
          description:
            "이용자가 로그인하거나 서비스를 이용하는 시점에 네트워크를 통해 전송됩니다.",
        },
        {
          term: "이전받는 자의 이용 목적",
          description: "각 사업자가 맡은 인증, 저장, 사이트 제공, 메일 발송 업무의 수행입니다.",
        },
        {
          term: "보유 기간",
          description:
            "회사가 위탁한 업무에 필요한 기간 동안 보유하고 목적이 달성되면 파기합니다. 각 사업자가 자체적으로 생성·보관하는 접속 기록 등의 보존 기간은 해당 사업자의 정책에 따릅니다.",
        },
      ],
    },

    { kind: "heading", text: "제8조 소셜 로그인" },
    {
      kind: "items",
      items: [
        "이용자가 선택한 소셜 로그인 제공자를 통해 인증이 이루어집니다.",
        "인증 과정에서 서비스 제공에 필요한 계정 식별자와 이메일 주소 등이 회사에 전달될 수 있습니다.",
        "전달되는 정보의 범위는 이용자가 해당 제공자에서 선택한 동의 항목에 따릅니다.",
        "회사는 각 제공자의 비밀번호를 수집하거나 보관하지 않습니다.",
        "Kakao 로그인은 이메일 항목만 요청하며 닉네임과 프로필 이미지는 요청하지 않습니다.",
      ],
    },

    { kind: "heading", text: "제9조 외부 자료 열람과 공공 정보 조회" },
    {
      kind: "items",
      items: [
        "학교·급식 정보 등 공공 정보를 조회하기 위해 외부 공공 데이터를 이용할 수 있으며, 이 경우 조회 목적에 필요한 정보만 사용합니다.",
        "이용자가 외부 기관의 자료나 파일로 연결되는 링크를 열면 해당 제공처와 직접 통신할 수 있습니다. 이때 생성되는 기록은 그 제공처의 정책에 따릅니다.",
        "회사는 이용자의 답안이나 성적을 외부 공공 정보 시스템으로 전송하지 않습니다.",
      ],
    },

    { kind: "heading", text: "제10조 브라우저 저장소의 사용" },
    {
      kind: "items",
      items: [
        "로그인 세션은 브라우저 저장소에 보관되어 로그인 상태를 유지합니다.",
        "작성 중인 답안 초안은 이용자의 브라우저에만 임시로 저장되며 계정이나 서버에 저장되지 않습니다.",
        "브라우저 저장소를 삭제하면 로그인이 해제되고 임시 초안이 사라집니다.",
      ],
    },

    { kind: "heading", text: "제11조 이용자의 권리와 행사 방법" },
    {
      kind: "items",
      items: [
        "이용자는 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다.",
        "동의한 사항에 대한 동의를 철회할 수 있습니다.",
        `권리 행사는 ${customerCenter.displayName}를 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.`,
        "이용자는 법정대리인이나 위임을 받은 대리인을 통해 권리를 행사할 수 있습니다.",
      ],
    },

    { kind: "heading", text: "제12조 계정 삭제" },
    {
      kind: "items",
      items: [
        `계정 삭제를 원하는 경우 ${customerCenter.displayName}(${customerCenter.primary.display})로 요청할 수 있습니다.`,
        "회사는 요청을 확인한 뒤 계정과 관련 정보를 삭제하고, 법령에 따라 보존해야 하는 기록은 다른 정보와 분리해 보존한 뒤 파기합니다.",
        "웹에서 직접 처리하는 자동화된 삭제 경로는 준비 중이며, 현재 준비 상태는 계정 삭제 안내 페이지에서 확인할 수 있습니다.",
      ],
    },

    { kind: "heading", text: "제13조 미성년자의 개인정보" },
    {
      kind: "items",
      items: [
        "LegendStudy LAB은 고등학생을 포함한 학생 이용자가 많은 서비스입니다.",
        "회원 가입 절차는 이용자의 연령을 별도로 수집하지 않으며, 생년월일과 주민등록번호를 수집하지 않습니다.",
        "미성년자의 개인정보에 관해서는 법정대리인이 이용자를 대신해 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
        `보호자는 ${customerCenter.displayName}를 통해 자녀의 개인정보에 관한 문의와 요청을 할 수 있습니다.`,
      ],
    },

    { kind: "heading", text: "제14조 개인정보의 안전성 확보조치" },
    {
      kind: "items",
      items: [
        "회원 인증과 데이터 저장은 접근 권한이 관리되는 호스팅 환경에서 처리합니다.",
        "비밀번호는 복호화할 수 없는 형태로 처리하며 회사가 평문으로 보관하지 않습니다.",
        "개인정보에 접근할 수 있는 권한을 업무에 필요한 범위로 제한합니다.",
        "개인정보를 처리하는 시스템의 접속 기록을 확인해 이상 접근을 점검합니다.",
      ],
    },

    { kind: "heading", text: "제15조 개인정보 보호책임자" },
    {
      kind: "definitions",
      entries: [
        { term: "성명", description: privacyOfficer.name },
        { term: "담당", description: privacyOfficer.role },
        { term: "연락처", description: privacyOfficer.channel.display },
      ],
    },
    {
      kind: "paragraph",
      text:
        "개인정보와 관련한 문의, 열람·정정·삭제·처리정지 요청과 불만 처리는 위 연락처로 접수할 수 있습니다.",
    },

    { kind: "heading", text: "제16조 개인정보처리방침의 변경과 고지" },
    {
      kind: "items",
      items: [
        "이 방침이 변경되는 경우 변경 내용과 시행 시점을 이 페이지에 안내합니다.",
        "이용자의 권리에 중요한 변경이 있는 경우에는 별도로 안내합니다.",
      ],
    },

    { kind: "heading", text: "제17조 시행일" },
    {
      kind: "paragraph",
      text: `본 개인정보처리방침은 ${effectiveDateLabel()}부터 시행합니다.`,
    },
  ],
};

export const legalDocuments: readonly LegalDocument[] = [termsDocument, privacyDocument];
