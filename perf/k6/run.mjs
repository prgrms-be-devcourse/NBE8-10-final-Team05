#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const DOMAIN_ENTRY = {
  auth: "auth/auth.js",
  posts: "posts/posts.js",
  letters: "letters/letters.js",
  diary: "diary/diary.js",
  members: "members/members.js",
  reports: "reports/reports.js",
  notifications: "notifications/notifications.js",
  "smoke-public-read": "smoke-public-read.js",
};

function parseEnvFile(content) {
  const env = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnvMap(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnvFile(fs.readFileSync(filePath, "utf8"));
}

function buildAutoTestId(domain, mode) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
  return `aws-${ts}-${domain}-${mode}`;
}

function printUsage() {
  const domains = Object.keys(DOMAIN_ENTRY).join(", ");
  console.log(
    [
      "사용법:",
      "  node perf/k6/run.mjs <domain> [mode] [-- <k6 추가 인자>]",
      "",
      "예시:",
      "  node perf/k6/run.mjs posts smoke",
      "  node perf/k6/run.mjs letters load -- -o experimental-prometheus-rw --tag testid=letters-load",
      "",
      `지원 도메인: ${domains}`,
      "",
      "기본 env 파일:",
      "  perf/env/cloud.env (없으면 perf/env/cloud.env.example)",
    ].join("\n"),
  );
}

const argv = process.argv.slice(2);
const divider = argv.indexOf("--");
const coreArgs = divider >= 0 ? argv.slice(0, divider) : argv;
const k6Args = divider >= 0 ? argv.slice(divider + 1) : [];

const domain = coreArgs[0];
if (!domain || !DOMAIN_ENTRY[domain]) {
  printUsage();
  process.exit(1);
}

const mode = (coreArgs[1] || process.env.MODE || "smoke").toLowerCase();
const scriptRelative = DOMAIN_ENTRY[domain];
const scriptPath = path.resolve(__dirname, scriptRelative);

const requestedEnvFile = path.resolve(repoRoot, "perf/env/cloud.env");
const fallbackEnvFile = path.resolve(repoRoot, "perf/env/cloud.env.example");
const envFile = fs.existsSync(requestedEnvFile) ? requestedEnvFile : fallbackEnvFile;

const fileEnv = loadEnvMap(envFile);
const mergedEnv = {
  ...process.env,
  ...fileEnv,
  MODE: mode,
};
const existingTestId = String(mergedEnv.TEST_ID || "").trim();
if (!existingTestId) {
  mergedEnv.TEST_ID = buildAutoTestId(domain, mode);
}

console.log(
  [
    `[k6-runner] domain=${domain}`,
    `[k6-runner] mode=${mode}`,
    `[k6-runner] test_id=${mergedEnv.TEST_ID}`,
    `[k6-runner] env_file=${envFile}`,
    `[k6-runner] script=${scriptPath}`,
  ].join("\n"),
);

const result = spawnSync("k6", ["run", scriptPath, ...k6Args], {
  cwd: repoRoot,
  stdio: "inherit",
  env: mergedEnv,
});

if (result.error) {
  console.error("[k6-runner] k6 실행 실패:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
