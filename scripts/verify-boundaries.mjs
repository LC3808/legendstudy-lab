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
  if (!source.includes("Credit 판매 상품")) {
    errors.push("pricing product section must keep the Owner-approved title");
  }
  // Every card carries the purchase CTA, and it stays disabled until a real
  // checkout exists behind it.
  if (!/pricing-plan__cta/.test(source) || !/disabled=\{!purchaseCta\.enabled\}/.test(source)) {
    errors.push("pricing cards must carry the purchase CTA in its disabled state");
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

// The operations console (/admin/) is an internal surface. It must stay
// unindexed, unreachable from the public route table, and read-only: every read
// goes through the deployed operator-gated RPCs, never a direct table query and
// never a privileged key.
const adminRoutes = ["admin/page.tsx", "admin/members/page.tsx", "admin/credit/page.tsx"];
for (const relative of adminRoutes) {
  const file = path.join(appRoot, relative);
  if (!fs.existsSync(file)) {
    errors.push(`operations console route missing: src/app/${relative}`);
    continue;
  }
  const source = fs.readFileSync(file, "utf8");
  if (!/robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/.test(source)) {
    errors.push(`operations console route must be noindex: src/app/${relative}`);
  }
}

const releaseRoutes = fs.readFileSync(path.join(sourceRoot, "lib", "release-routes.ts"), "utf8");
/** Body of one exported array literal, so the checks stay scoped to that list. */
function routeArrayBody(name) {
  const match = releaseRoutes.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return match ? match[1] : "";
}
const adminRoutePattern = /["'`]\/admin/;
if (!adminRoutePattern.test(routeArrayBody("internalFoundationPathPrefixes"))) {
  errors.push("operations console must stay in the internal route prefixes");
}
for (const list of ["publicReleaseRoutes", "indexablePublicPaths", "policyRoutes"]) {
  if (adminRoutePattern.test(routeArrayBody(list))) {
    errors.push(`operations console must not be a public or indexable route (${list})`);
  }
}
if (/ADMIN_NAV|admin-nav/.test(releaseRoutes)) {
  errors.push("operations console must not be linked from the public navigation");
}

const adminFiles = files.filter((file) => /[\\/]src[\\/](lib|components)[\\/]admin[\\/]/.test(file));
if (adminFiles.length === 0) errors.push("operations console client modules are missing");
for (const file of adminFiles) {
  if (/\.test\.tsx?$/.test(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  // No direct table access: the console only ever calls the gated functions.
  if (/\.from\(\s*["'`]/.test(source)) {
    errors.push(`operations console reads a table directly instead of the gated RPC: ${relative}`);
  }
  // No write verb of any kind.
  if (/\.(insert|update|upsert|delete)\(/.test(source)) {
    errors.push(`operations console contains a write call: ${relative}`);
  }
  // No privileged or finance credential reference.
  if (/service_role|SERVICE_ROLE|essay_finance|essay_executor|admin_users/.test(source)) {
    errors.push(`operations console references a privileged token or operations table: ${relative}`);
  }
}


// ADMIN-P0-B — the finance boundary is server-only, and the console must not
// grow a browser path to the ledger.
const financeModule = "cloudflare/admin-finance.ts";
if (fs.existsSync(financeModule)) {
  const finance = fs.readFileSync(financeModule, "utf8");
  const required = [
    ["the finance boundary must verify the caller with the database", /callRpc\("admin_operator"/],
    ["the finance boundary must mint a short-lived finance JWT", /FINANCE_JWT_PRIVATE_KEY/],
    ["the finance boundary must fail closed without signing material", /return json\(\{ error: "unavailable" \}, 503\)/],
    ["the finance boundary must not trust an actor from the body", /operatorIdentity/],
  ];
  for (const [message, pattern] of required) {
    if (!pattern.test(finance)) errors.push(message);
  }
  // A privileged key must never appear in the boundary.
  if (/service_role|SUPABASE_SERVICE_ROLE/i.test(finance)) {
    errors.push("the finance boundary must not reference a service-role key");
  }
}
for (const name of ["credit-grant", "payment-support"]) {
  const file = `functions/api/admin/${name}.ts`;
  if (!fs.existsSync(file)) errors.push(`missing server boundary route ${file}`);
}
// The browser half must reach the ledger only through the boundary.
const boundaryClient = "src/lib/admin/finance-boundary.ts";
if (fs.existsSync(boundaryClient)) {
  const source = fs.readFileSync(boundaryClient, "utf8");
  if (!source.includes("/api/admin/credit-grant")) {
    errors.push("the browser finance client must call the server boundary");
  }
  if (/essay_admin_grant|payment_support/.test(source.replace(/\/\*[\s\S]*?\*\//g, ""))) {
    errors.push("the browser finance client must not call the ledger functions directly");
  }
}
// No client module may call a finance RPC directly.
for (const file of files) {
  if (!file.startsWith("src/components/") && !file.startsWith("src/app/")) continue;
  const source = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  if (/rpc\(\s*["'`](essay_admin_grant|payment_support)["'`]/.test(source)) {
    errors.push(`${file} calls a finance-only RPC directly`);
  }
}
// The member inquiry surface must not promise a reply body by email alone.
const memberInquiry = "src/components/support/member-inquiry.tsx";
if (fs.existsSync(memberInquiry)) {
  const source = fs.readFileSync(memberInquiry, "utf8");
  if (/답변 내용을 (화면에서|여기에서) 확인/.test(source)) {
    errors.push("the member inquiry surface must not promise a reply view it does not have");
  }
}

if (errors.length) {
  console.error("BOUNDARY_AUDIT=FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("BOUNDARY_AUDIT=PASS");
console.log(`client_components=${clientFiles.length}; server_modules=${serverFiles.length}; blocked_runtime_dependencies=0`);
