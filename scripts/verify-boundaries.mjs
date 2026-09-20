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
  if (source.includes("@/server/") || source.includes("server-only")) {
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
for (const blockedDependency of ["express", "@trpc/server", "@trpc/client", "@supabase/supabase-js"]) {
  if (packageJson.dependencies?.[blockedDependency] || packageJson.devDependencies?.[blockedDependency]) {
    errors.push(`blocked runtime dependency present: ${blockedDependency}`);
  }
}

const combinedSource = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const prohibited of ["SUPABASE_SERVICE_ROLE", "service_role", "sk-", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "PAYMENT_SECRET"]) {
  if (combinedSource.includes(prohibited)) errors.push(`prohibited secret-like token found: ${prohibited}`);
}

if (errors.length) {
  console.error("BOUNDARY_AUDIT=FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("BOUNDARY_AUDIT=PASS");
console.log(`client_components=${clientFiles.length}; server_modules=${serverFiles.length}; blocked_runtime_dependencies=0`);
