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
  if (/KAKAO_CLIENT_SECRET|KAKAO_REST_API_KEY/.test(fs.readFileSync(file, "utf8")) && !file.endsWith(".test.ts")) {
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

if (errors.length) {
  console.error("BOUNDARY_AUDIT=FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("BOUNDARY_AUDIT=PASS");
console.log(`client_components=${clientFiles.length}; server_modules=${serverFiles.length}; blocked_runtime_dependencies=0`);
