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

if (errors.length) {
  console.error("BOUNDARY_AUDIT=FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("BOUNDARY_AUDIT=PASS");
console.log(`client_components=${clientFiles.length}; server_modules=${serverFiles.length}; blocked_runtime_dependencies=0`);
