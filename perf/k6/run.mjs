#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
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

function trimEnvValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeBaseUrlValue(value) {
  return trimEnvValue(value).replace(/\/+$/, "");
}

function resolveBaseUrl(env) {
  const baseUrl = normalizeBaseUrlValue(env.BASE_URL);
  if (baseUrl) {
    return { value: baseUrl, source: "BASE_URL" };
  }

  return { value: "http://localhost:8080", source: "default" };
}

function isLocalhostBaseUrl(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getSocketTarget(baseUrl) {
  const parsed = new URL(baseUrl);
  const port =
    parsed.port || (parsed.protocol === "https:" ? "443" : parsed.protocol === "http:" ? "80" : "");

  return {
    host: parsed.hostname,
    port: Number(port),
  };
}

function checkLocalTcpReachability(baseUrl, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let target;
    try {
      target = getSocketTarget(baseUrl);
      if (!Number.isFinite(target.port) || target.port <= 0) {
        finish({ ok: false, reason: "invalid_port" });
        return;
      }
    } catch {
      finish({ ok: false, reason: "invalid_url" });
      return;
    }

    const socket = net.connect(target.port, target.host);
    const closeSocket = () => {
      if (!socket.destroyed) {
        socket.destroy();
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      closeSocket();
      finish({ ok: true });
    });
    socket.once("timeout", () => {
      closeSocket();
      finish({ ok: false, reason: "timeout" });
    });
    socket.once("error", (error) => {
      closeSocket();
      finish({ ok: false, reason: error.code || "error" });
    });
  });
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
const requestedEnvExists = fs.existsSync(requestedEnvFile);
const envFile = requestedEnvExists ? requestedEnvFile : fallbackEnvFile;

const fileEnv = loadEnvMap(envFile);
const mergedEnv = {
  ...fileEnv,
  ...process.env,
  MODE: mode,
};
const fileBaseUrl = normalizeBaseUrlValue(fileEnv.BASE_URL);
const processBaseUrl = normalizeBaseUrlValue(process.env.BASE_URL);
const resolvedBaseUrlConfig = resolveBaseUrl(mergedEnv);
const resolvedBaseUrl = resolvedBaseUrlConfig.value;
const resolvedBaseUrlSource = resolvedBaseUrlConfig.source;
mergedEnv.BASE_URL = resolvedBaseUrl;
const existingTestId = String(mergedEnv.TEST_ID || "").trim();
if (!existingTestId) {
  mergedEnv.TEST_ID = buildAutoTestId(domain, mode);
}

async function main() {
  console.log(
    [
      `[k6-runner] domain=${domain}`,
      `[k6-runner] mode=${mode}`,
      `[k6-runner] test_id=${mergedEnv.TEST_ID}`,
      `[k6-runner] env_file=${envFile}`,
      `[k6-runner] base_url=${resolvedBaseUrl}`,
      `[k6-runner] base_url_source=${resolvedBaseUrlSource}`,
      `[k6-runner] script=${scriptPath}`,
    ].join("\n"),
  );

  if (
    !requestedEnvExists &&
    !fileBaseUrl &&
    !processBaseUrl
  ) {
    console.warn(
      [
        "[k6-runner] 경고: perf/env/cloud.env가 없어 예제 파일(perf/env/cloud.env.example)로 실행 중입니다.",
        "[k6-runner] 경고: BASE_URL이 비어 있어 대상 API가 기본값 http://localhost:8080 으로 설정됩니다.",
        "[k6-runner] 경고: K6_PROMETHEUS_RW_SERVER_URL은 메트릭 저장 위치일 뿐, 부하 대상 API URL을 바꾸지 않습니다.",
        "[k6-runner] 경고: 원격 환경 테스트는 `BASE_URL=https://<api-domain>` 또는 `BASE_URL=http://<public-ip>:18080` 형태로 지정하세요.",
      ].join("\n"),
    );
  }

  if (isLocalhostBaseUrl(resolvedBaseUrl)) {
    const reachable = await checkLocalTcpReachability(resolvedBaseUrl);
    if (!reachable.ok) {
      const target = getSocketTarget(resolvedBaseUrl);
      const hint =
        processBaseUrl || fileBaseUrl
          ? "직접 앱 포트나 로컬 백엔드가 열려 있는지 확인하거나 BASE_URL을 올바른 주소로 바꿔주세요."
          : "로컬 백엔드를 먼저 띄우거나 BASE_URL을 원격 API 주소로 지정하세요.";
      console.error(
        [
          `[k6-runner] 대상 API(${target.host}:${target.port})에 연결할 수 없습니다. reason=${reachable.reason}`,
          `[k6-runner] ${hint}`,
        ].join("\n"),
      );
      process.exit(1);
    }
  }

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
}

await main();
