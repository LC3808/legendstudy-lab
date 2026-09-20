import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const prohibitedPathPatterns = [
  /^(?:node_modules|\.next|build|dist|coverage|\.cache)\//,
  /(?:^|\/)\.DS_Store$/,
  /(?:^|\/)(?:npm-debug|yarn-debug|pnpm-debug).*\.log$/,
  /\.pem$/,
  /\.key$/,
  /(?:^|\/)id_rsa$/,
  /(?:^|\/)\.env(?:\.|$)/,
];

const secretValuePatterns = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /gho_[A-Za-z0-9]{20,}/,
  /glpat-[A-Za-z0-9_-]{20,}/,
  /sk-[A-Za-z0-9_-]{16,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /(?:service_role|CLOUDFLARE_API_TOKEN|CF_API_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|STRIPE_SECRET_KEY|PRIVATE_KEY|CLIENT_SECRET)\s*[:=]\s*[A-Za-z0-9_./+-]{8,}/i,
];

const excludedContentPaths = new Set([
  "pnpm-lock.yaml",
  "scripts/audit-github-ready.mjs",
]);

const badPaths = tracked.filter((path) => prohibitedPathPatterns.some((pattern) => pattern.test(path)));
const secretFindings = [];

for (const path of tracked) {
  if (excludedContentPaths.has(path)) continue;
  const content = readFileSync(path, "utf8");
  if (secretValuePatterns.some((pattern) => pattern.test(content))) {
    secretFindings.push(path);
  }
}

if (badPaths.length || secretFindings.length) {
  if (badPaths.length) console.error(`PROHIBITED_TRACKED_PATHS=${badPaths.join(",")}`);
  if (secretFindings.length) console.error(`POSSIBLE_SECRET_VALUE_FILES=${secretFindings.join(",")}`);
  process.exit(1);
}

console.log("GITHUB_READINESS_AUDIT=PASS");
console.log(`tracked_files=${tracked.length}; prohibited_paths=0; possible_secret_value_files=0`);
