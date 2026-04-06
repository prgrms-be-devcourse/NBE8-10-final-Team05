/**
 * reports 도메인 부하 테스트
 * - 기본: 관리자 대시보드/목록/상세 조회
 * - 옵션: 일반 사용자 신고 생성 + 관리자 처리
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { MODE, chance, normalizeBaseUrl, readBoolean, readNumber, readString } from "../lib/env.js";
import { getAccessToken } from "../lib/auth.js";
import { asArray, bearerHeaders, dataOf, firstNumericId } from "../lib/http.js";
import {
  buildSegmentedModeOptions,
  resolveShare,
  resolveThinkSeconds,
} from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "reports";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    reports_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "reportsSmokeJourney",
    },
  },
  load: {
    reports_admin_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 31, duration: "2m" },
        { target: 31, duration: "5m" },
        { target: 63, duration: "2m" },
        { target: 63, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "reportsAdminReader",
    },
    reports_user_create: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 13, duration: "2m" },
        { target: 13, duration: "5m" },
        { target: 25, duration: "2m" },
        { target: 25, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "reportsUserCreate",
    },
    reports_admin_handle: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 6, duration: "2m" },
        { target: 6, duration: "5m" },
        { target: 12, duration: "2m" },
        { target: 12, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "reportsAdminHandle",
    },
  },
  stress: {
    reports_admin_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 25, duration: "3m" },
        { target: 60, duration: "7m" },
        { target: 90, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "reportsAdminReader",
    },
    reports_user_create: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 8, duration: "3m" },
        { target: 20, duration: "7m" },
        { target: 30, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "reportsUserCreate",
    },
    reports_admin_handle: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 4, duration: "3m" },
        { target: 10, duration: "7m" },
        { target: 16, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "reportsAdminHandle",
    },
  },
};
const THINK_SECONDS = resolveThinkSeconds("REPORTS", 0.7);
const ENABLE_CREATE =
  MODE === "smoke"
    ? readBoolean("REPORTS_ENABLE_CREATE_SMOKE", true)
    : readBoolean("REPORTS_ENABLE_CREATE", false);
const defaultCreateShare = MODE === "smoke" ? 1 : MODE === "stress" ? 0.3 : 0.25;
const CREATE_SHARE = resolveShare("REPORTS", "CREATE_SHARE", defaultCreateShare);
const REPORT_REASON = readString("REPORTS_REASON", "SPAM");
const ADMIN_HANDLE_ACTION = readString("ADMIN_REPORT_HANDLE_ACTION", "NONE").toUpperCase();
const ADMIN_REPORT_ADMIN_COMMENT = readString("ADMIN_REPORT_ADMIN_COMMENT", "k6-admin-comment");
const ADMIN_REPORT_NOTIFY = readBoolean("ADMIN_REPORT_NOTIFY", false);
const ADMIN_REPORT_NOTIFICATION_MESSAGE = readString("ADMIN_REPORT_NOTIFICATION_MESSAGE", "");

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("REPORTS_P95_MS", 1200),
  SCENARIO_BY_MODE,
);
export const handleSummary = buildSummary(DOMAIN);

let cachedUserToken;
let cachedAdminToken;
function userToken() {
  if (!cachedUserToken) {
    cachedUserToken = getAccessToken(BASE_URL, {
      role: "user",
      preferTokenPool: true,
    });
  }
  return cachedUserToken;
}

function adminToken() {
  if (!cachedAdminToken) {
    cachedAdminToken = getAccessToken(BASE_URL, {
      role: "admin",
      preferTokenPool: true,
    });
  }
  return cachedAdminToken;
}

function fetchFirstPostId() {
  const response = http.get(`${BASE_URL}/api/v1/posts?page=0&size=5`);
  check(response, {
    "reports target posts list status 200": (res) => res.status === 200,
  });
  return firstNumericId(asArray(dataOf(response)?.content));
}

function createReport(token) {
  const targetId = fetchFirstPostId();
  if (!targetId) return null;

  const response = http.post(
    `${BASE_URL}/api/v1/reports`,
    JSON.stringify({
      targetId,
      targetType: "POST",
      reason: REPORT_REASON,
      content: "k6 report sample",
    }),
    {
      headers: bearerHeaders(token),
    },
  );
  check(response, {
    "report create status 200": (res) => res.status === 200,
    "report create id 응답": (res) => Number.isFinite(Number(dataOf(res))),
  });

  const reportId = Number(dataOf(response));
  return Number.isFinite(reportId) ? reportId : null;
}

function readAdminStats(token) {
  const response = http.get(`${BASE_URL}/api/v1/admin/dashboard/stats`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "admin stats status 200": (res) => res.status === 200,
  });
}

function readAdminReports(token) {
  const response = http.get(`${BASE_URL}/api/v1/admin/reports`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "admin reports list status 200": (res) => res.status === 200,
  });
  return asArray(dataOf(response));
}

function readAdminReportDetail(token, reportId) {
  const response = http.get(`${BASE_URL}/api/v1/admin/reports/${reportId}`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "admin report detail status 200": (res) => res.status === 200,
  });
}

function handleReport(token, reportId) {
  if (!reportId || ADMIN_HANDLE_ACTION === "NONE") return;

  const response = http.post(
    `${BASE_URL}/api/v1/admin/reports/${reportId}/handle`,
    JSON.stringify({
      action: ADMIN_HANDLE_ACTION,
      adminComment: ADMIN_REPORT_ADMIN_COMMENT,
      isNotify: ADMIN_REPORT_NOTIFY,
      notificationMessage: ADMIN_REPORT_NOTIFICATION_MESSAGE,
    }),
    {
      headers: bearerHeaders(token),
    },
  );
  check(response, {
    "admin report handle status 200": (res) => res.status === 200,
  });
}

export default function () {
  reportsSmokeJourney();
}

export function reportsSmokeJourney() {
  const admin = adminToken();
  if (!admin) {
    check(null, {
      "reports admin token 확보": () => false,
    });
    sleep(THINK_SECONDS);
    return;
  }

  let createdReportId = null;
  if (ENABLE_CREATE && chance(CREATE_SHARE)) {
    const user = userToken();
    if (user) {
      group("reports create", () => {
        createdReportId = createReport(user);
      });
    } else {
      check(null, {
        "reports user token 확보": () => false,
      });
    }
  }

  reportsAdminReadCore(admin, createdReportId, true);

  sleep(THINK_SECONDS);
}

function reportsAdminReadCore(admin, preferredReportId = null, withHandle = false) {
  group("reports admin read", () => {
    readAdminStats(admin);
    const reports = readAdminReports(admin);
    const reportId = preferredReportId ?? Number(reports[0]?.reportId ?? null);
    if (Number.isFinite(reportId)) {
      readAdminReportDetail(admin, reportId);
      if (withHandle) {
        handleReport(admin, reportId);
      }
    }
  });
}

export function reportsAdminReader() {
  const admin = adminToken();
  if (!admin) {
    check(null, { "reports admin reader token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  reportsAdminReadCore(admin, null, false);
  sleep(THINK_SECONDS);
}

export function reportsUserCreate() {
  const user = userToken();
  if (!user) {
    check(null, { "reports user create token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  if (ENABLE_CREATE && chance(CREATE_SHARE)) {
    group("reports user create", () => {
      createReport(user);
    });
  } else {
    fetchFirstPostId();
  }
  sleep(THINK_SECONDS);
}

export function reportsAdminHandle() {
  const admin = adminToken();
  if (!admin) {
    check(null, { "reports admin handle token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  reportsAdminReadCore(admin, null, true);
  sleep(THINK_SECONDS);
}
