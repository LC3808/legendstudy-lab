import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}

walk(sourceRoot);
const errors = [];
const clientFiles = files.filter((file) => fs.readFileSync(file, "utf8").startsWith('"use client"'));
for (const file of clientFiles) {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("@/server/") || source.includes("server-only") || source.includes("cloudflare/") || source.includes("functions/")) {
    errors.push(`client component imports server-only code: ${path.relative(root, file)}`);
  }
}

const serverFiles = files.filter((file) => file.includes(`${path.sep}src${path.sep}server${path.sep}`));
for (const file of serverFiles) {
  if (!fs.readFileSync(file, "utf8").includes('import "server-only"')) {
    errors.push(`server module missing server-only marker: ${path.relative(root, file)}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const blockedDependency of ["express", "@trpc/server", "@trpc/client"]) {
  if (packageJson.dependencies?.[blockedDependency] || packageJson.devDependencies?.[blockedDependency]) {
    errors.push(`blocked runtime dependency present: ${blockedDependency}`);
  }
}

// Cloudflare exchange secrets must never be referenced from any browser source.
for (const file of files) {
  if (/KAKAO_CLIENT_SECRET|KAKAO_REST_API_KEY|TOSS_TEST_SECRET_KEY|PAYMENT_FINANCE_TOKEN|PAYMENT_SUPPORT_SUBJECTS/.test(fs.readFileSync(file, "utf8")) && !file.endsWith(".test.ts")) {
    errors.push(`server Kakao binding referenced in browser source: ${path.relative(root, file)}`);
  }
}

const combinedSource = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const prohibited of ["SUPABASE_SERVICE_ROLE", "service_role", "sk-", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "PAYMENT_SECRET"]) {
  if (combinedSource.includes(prohibited)) errors.push(`prohibited secret-like token found: ${prohibited}`);
}

// A route-level loading boundary breaks the static export. Every route is
// prerendered here, so loading.tsx only adds a Suspense boundary; once a page
// exceeds React's progressive chunk size that boundary flushes its fallback as
// the visible <main> and hides the real page until hydration. See
// docs/STATIC_EXPORT_NOTES.md.
const appRoot = path.join(sourceRoot, "app");
const loadingBoundaries = [];
(function findLoadingBoundaries(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) findLoadingBoundaries(full);
    else if (entry.name === "loading.tsx") loadingBoundaries.push(full);
  }
})(appRoot);
for (const file of loadingBoundaries) {
  errors.push(`route loading boundary breaks static export output: ${path.relative(root, file)}`);
}

// The support page is consumer-facing, so operational headings that were
// removed must not return: they made the page read like an internal runbook
// and pushed the two contact channels below the fold.
const supportPage = path.join(appRoot, "support", "page.tsx");
const removedSupportHeadings = [
  "이메일 문의",
  "문의 유형",
  "환불 문의",
  "접수와 처리 절차",
  "관련 안내",
  "보조 연락수단",
];
if (fs.existsSync(supportPage)) {
  const source = fs.readFileSync(supportPage, "utf8");
  for (const heading of removedSupportHeadings) {
    if (new RegExp(`<h[1-6][^>]*>\\s*${heading}\\s*<`).test(source)) {
      errors.push(`removed support heading returned: ${heading}`);
    }
  }
}

// /pricing/ is a consumer shopping page. The internal build state, the release
// roadmap, the excluded 20 Credit pack and the duplicated sales-information box
// were removed from it; a later edit must not quietly bring them back.
const pricingPage = path.join(appRoot, "pricing", "page.tsx");
const removedPricingCopy = [
  "서비스 준비 중",
  "출시 시 제공",
  "1차 출시",
  "20 Credits",
  "CORE",
  "확정된 출시 일정",
  "판매 환경 변경",
  "관할 행정기관",
  "결제 기능을 준비",
  "결제가 열리면",
  "결제 준비 중",
  "곧 구매 가능",
  "출시 예정",
  "준비 중",
];
if (fs.existsSync(pricingPage)) {
  const source = fs.readFileSync(pricingPage, "utf8");
  for (const phrase of removedPricingCopy) {
    if (source.includes(phrase)) {
      errors.push(`removed pricing copy returned: ${phrase}`);
    }
  }
  // The page must not narrate the release state of the service or of payment.
  if (/ReleaseStatusLabel|ReleaseNotice/.test(source)) {
    errors.push("pricing page renders a release-state component");
  }
  if (/serviceAvailability/.test(source)) {
    errors.push("pricing page renders internal service availability state");
  }
  // Product, price and validity are stated once; the duplicated box is gone.
  for (const term of ["판매 상품", "판매 가격"]) {
    if (new RegExp(`<dt>\\s*${term}\\s*</dt>`).test(source)) {
      errors.push(`duplicated sales information returned on /pricing/: ${term}`);
    }
  }
  // The pack cards are the only product table: every pack gives the same service
  // scope and differs only in quantity, so a second comparison table would
  // repeat the cards row for row.
  if (/pricing-table/.test(source)) {
    errors.push("the duplicated Credit comparison table returned on /pricing/");
  }
  if (!source.includes("판매 상품")) {
    errors.push("pricing product section must keep the Owner-approved title");
  }
  // Every card carries the control. The labels ("선택하기" / "결제하기") come from
  // the module-level selection so the static export and the hydrated page agree,
  // and the enabled state comes from the payment runtime. The page must delegate
  // both, and must never carry a hard-coded control or a price of its own.
  if (!/<PricingPlans\s*\/>/.test(source)) {
    errors.push("pricing cards must be rendered by the PricingPlans component");
  }
  if (/<article[^>]*className="plan-card"/.test(source)) {
    errors.push("the pricing page must not hard-code the product card markup");
  }
  if (/purchaseCta\.enabled/.test(source)) {
    errors.push("the pricing page must not decide the CTA state from a build constant");
  }
  // The Owner keeps the school/group/event entry point on the page even though
  // the redemption backend does not exist yet.
  if (!/pricing-promo-title/.test(source) || !/<PricingPromoForm\s*\/>/.test(source)) {
    errors.push("pricing page must keep the school/group/event promotion entry");
  }
  // The pre-purchase guide states what a consumer must read before paying.
  if (!/pricing-purchase-title/.test(source) || !/purchaseGuide\.items/.test(source)) {
    errors.push("pricing page must keep the pre-purchase guide");
  }
  // globals.css omits the shared footer on this one route, so the page has to
  // keep publishing everything the footer otherwise carried: the seller
  // identity, the customer centre and the four policy links.
  if (!/<BusinessInfoList/.test(source)) {
    errors.push("pricing page must render the seller identity in its own block");
  }
  if (!/<ContactList/.test(source)) {
    errors.push("pricing page must render the customer centre in its own block");
  }
  for (const href of ["/terms/", "/privacy/", "/refund/", "/support/"]) {
    if (!source.includes(`"${href}"`)) {
      errors.push(`pricing page must link ${href} because the footer is omitted`);
    }
  }
}

// Checkout is the payment path a merchant/card reviewer walks. The browser may
// send a SKU and a request key and nothing else: no price, no quantity, no
// owner, no redirect, no mode. The server snapshot is the only thing shown and
// the only thing paid.
const checkoutComponent = path.join(sourceRoot, "components", "payment-checkout.tsx");
if (fs.existsSync(checkoutComponent)) {
  const source = fs.readFileSync(checkoutComponent, "utf8");
  for (const banned of ["service_role", "SERVICE_ROLE", "PAYMENT_FINANCE_TOKEN"]) {
    if (source.includes(banned)) {
      errors.push(`checkout must not hold a privileged payment capability: ${banned}`);
    }
  }
  if (!/sku:\s*`\$\{plan\.credits\}c`/.test(source)) {
    errors.push("checkout must create the order from a SKU only");
  }
  if (!/js\.tosspayments\.com\/v2\/standard/.test(source) || !/requestPayment/.test(source)) {
    errors.push("checkout must open the official Toss payment window");
  }
  if (!/r\.checkout/.test(source)) {
    errors.push("checkout must pay the server snapshot, not a browser value");
  }
  if (!/signedIn/.test(source)) {
    errors.push("checkout must require an authenticated account");
  }
  // /pricing/ and the checkout render the same card component, so the same pack
  // cannot look like two different products on the two routes.
  if (!/<PlanCard\s/.test(source)) {
    errors.push("checkout must render the same product card as /pricing/");
  }
  // The Owner removed the test-environment narration from the checkout.
  if (/테스트 결제 환경/.test(source)) {
    errors.push("checkout must not narrate the test environment to a buyer");
  }
}
// The card-review runtime runs on the real service origin against the Production
// account. It must stay a TEST merchant runtime, and the checkout may only open for
// the allowlisted reviewer, whose identity the server resolves itself.
const paymentRuntimeSource = path.join(root, "cloudflare", "payments.ts");
if (fs.existsSync(paymentRuntimeSource)) {
  const source = fs.readFileSync(paymentRuntimeSource, "utf8");
  for (const [pattern, message] of [
    [/mode === 'REVIEW'/, "the production card-review runtime mode must exist"],
    [/PAYMENT_REVIEW_SUBJECTS/, "the card-review runtime must gate on a server-side reviewer allowlist"],
    [/auth\/v1\/user/, "the card-review runtime must resolve the reviewer from Auth, not from the browser"],
    [/review && !\(e\.PAYMENT_REVIEW_SUBJECTS/, "a card-review runtime without an allowlist must fail closed"],
    [/test \? \/\^test_ck_\//, "the card-review runtime must keep the TEST merchant key family"],
    [/REVIEW_REQUIRED/, "a non-allowlisted member must be refused before any order is created"],
  ]) {
    if (!pattern.test(source)) {
      errors.push(message);
    }
  }
}
const paymentLayout = path.join(appRoot, "payments", "layout.tsx");
if (!fs.existsSync(paymentLayout) || !/index:\s*false/.test(fs.readFileSync(paymentLayout, "utf8"))) {
  errors.push("payment routes must stay out of the search index");
}

// Consumer-facing routes and the legal documents must never carry internal
// build or review vocabulary. Test files are excluded: they assert that these
// tokens are absent, so they have to name them.
const publicSurfaceFiles = files.filter(
  (file) =>
    !/\.test\.tsx?$/.test(file) &&
    (/[\\/]src[\\/]app[\\/]/.test(file) || /[\\/]src[\\/]lib[\\/]legal-documents\.ts$/.test(file)),
);
const internalVocabulary = [
  "LEGAL_REVIEW_RECOMMENDED",
  "OWNER_PENDING",
  "OWNER_DATA_REQUIRED",
  "PROCESSOR_AND_TRANSFER_DETAIL",
  "PRODUCTION_ACTIVATION_GATE",
  "확정 후 게시",
  "법률 검토 후 확정",
];
for (const file of publicSurfaceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const token of internalVocabulary) {
    if (source.includes(token)) {
      errors.push(`internal vocabulary on a public surface: ${token} (${path.relative(root, file)})`);
    }
  }
}

// Commercial and policy values live in pricing.ts and business-info.ts. A page
// that retypes one can be left behind by a later change, so the literals are
// rejected on the public policy pages.
const canonicalValueLiterals = ["4,900", "11,900", "17,900", "29,900", "14일", "3개월"];
for (const relative of [
  "app/pricing/page.tsx",
  "app/refund/page.tsx",
  "app/support/page.tsx",
  "app/terms/page.tsx",
  "app/privacy/page.tsx",
]) {
  const file = path.join(sourceRoot, relative);
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const literal of canonicalValueLiterals) {
    if (source.includes(literal)) {
      errors.push(
        `policy value retyped instead of read from a canonical module: ${literal} (${path.relative(root, file)})`,
      );
    }
  }
}

// The HOME page states the service value in short copy. The Owner removed the
// implementation-status, identity and policy wording from it, so those blocks
// must not come back, and the header must keep the simplified product menu.
const homeFile = path.join(sourceRoot, "components/lab-landing.tsx");
if (fs.existsSync(homeFile)) {
  const home = fs.readFileSync(homeFile, "utf8");
  for (const literal of [
    "설계 단계",
    "준비 단계",
    "기록하고, 분석하고, 이해하고, 결정합니다.",
    "지금의 위치를 이해하는 것부터.",
    "공개 범위 보기",
    "LegendStudy 계정으로 LAB을 시작하세요",
    "계정과 개인 기록은 분리해 다룹니다",
    "이 설명은 제품 방향이며",
    "각 분석이 서로 다른 계정·프로필·데이터 섬으로 나뉘지 않습니다",
  ]) {
    if (home.includes(literal)) {
      errors.push(`removed HOME copy returned to the landing: ${literal}`);
    }
  }
  for (const literal of ["내신 분석", "수능·모의고사 분석", "논술 첨삭"]) {
    if (!home.includes(literal)) {
      errors.push(`landing is missing the Owner-confirmed axis label: ${literal}`);
    }
  }
}

const routesFile = path.join(sourceRoot, "lib/release-routes.ts");
if (fs.existsSync(routesFile)) {
  const routes = fs.readFileSync(routesFile, "utf8");
  const menu = routes.slice(
    routes.indexOf("authenticatedProductRoutes"),
    routes.indexOf("export const policyRoutes"),
  );
  for (const literal of ["홈", "내신 분석 LAB", "모의·수능 분석 LAB", "논술 LAB"]) {
    if (!menu.includes(literal)) {
      errors.push(`authenticated product menu is missing the Owner-confirmed entry: ${literal}`);
    }
  }
  for (const literal of ["성적 분석", "내 기록", "마이페이지", "고객센터"]) {
    if (menu.includes(`label: "${literal}"`)) {
      errors.push(`retired entry returned to the authenticated product menu: ${literal}`);
    }
  }
}

const shellFile = path.join(sourceRoot, "components/site-shell.tsx");
if (fs.existsSync(shellFile)) {
  const shell = fs.readFileSync(shellFile, "utf8");
  if (shell.includes('href="/support/"')) {
    errors.push("the customer centre button returned to the header action cluster");
  }
}

// The product card, the brand identity and the retired selection style.
const cardFile = path.join(sourceRoot, "components", "plan-card.tsx");
if (!fs.existsSync(cardFile)) {
  errors.push("the shared product card component is missing");
} else {
  const card = fs.readFileSync(cardFile, "utf8");
  if (!/data-selected=/.test(card)) {
    errors.push("the shared product card must expose its selected state");
  }
  if (/pricing-plan/.test(card)) {
    errors.push("the shared product card must not keep the retired per-page class names");
  }
}
const cssFile = path.join(root, "src/app/globals.css");
if (fs.existsSync(cssFile)) {
  const css = fs.readFileSync(cssFile, "utf8");
  // The Owner discarded the red selection border: selection is the brand identity.
  if (/--checkout-selected|#d02b2b/.test(css)) {
    errors.push("the discarded red selection style returned to the stylesheet");
  }
  if (!/--brand: #ffac14;/.test(css)) {
    errors.push("the brand identity token is missing from the stylesheet");
  }
  if (!/\.plan-card\[data-selected="true"\]/.test(css)) {
    errors.push("the shared card must carry a selected state style");
  }
  // Recommendation is a badge, never a heavier border: the two states must not
  // be expressible through the same property.
  if (/\.plan-card:has\(\.plan-card__badge\)/.test(css)) {
    errors.push("recommendation must not be expressed as a heavier card border");
  }
}

if (errors.length) {
  console.error("BOUNDARY_AUDIT=FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("BOUNDARY_AUDIT=PASS");
console.log(`client_components=${clientFiles.length}; server_modules=${serverFiles.length}; blocked_runtime_dependencies=0`);
