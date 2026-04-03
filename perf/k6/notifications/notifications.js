/**
 * notifications 도메인 부하 테스트
 * - 알림 목록 조회 폴링 부하를 측정
 * - SSE 장기 연결은 별도 시나리오로 분리 권장
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { normalizeBaseUrl, readNumber } from "../lib/env.js";
import { getAccessToken } from "../lib/auth.js";
import { bearerHeaders } from "../lib/http.js";
import { buildSegmentedModeOptions, resolveThinkSeconds } from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "notifications";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    notifications_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "notificationsSmokeJourney",
    },
  },
  load: {
    notifications_poller_normal: {
      executor: "constant-vus",
      vus: 170,
      duration: "20m",
      gracefulStop: "30s",
      exec: "notificationsPollerNormal",
    },
    notifications_poller_burst: {
      executor: "constant-vus",
      vus: 70,
      duration: "20m",
      gracefulStop: "30s",
      exec: "notificationsPollerBurst",
    },
  },
  stress: {
    notifications_poller_normal: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 90, duration: "3m" },
        { target: 220, duration: "7m" },
        { target: 320, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "notificationsPollerNormal",
    },
    notifications_poller_burst: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 30, duration: "3m" },
        { target: 80, duration: "7m" },
        { target: 140, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "notificationsPollerBurst",
    },
  },
};
const THINK_SECONDS = resolveThinkSeconds("NOTIFICATIONS", 0.3);
const READ_ROUNDS = readNumber("NOTIFICATIONS_READ_ROUNDS", 2);

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("NOTIFICATIONS_P95_MS", 1000),
  SCENARIO_BY_MODE,
);
export const handleSummary = buildSummary(DOMAIN);

let cachedToken;
function userToken() {
  if (!cachedToken) {
    cachedToken = getAccessToken(BASE_URL, {
      role: "user",
      preferTokenPool: true,
    });
  }
  return cachedToken;
}

function pollNotifications(token, rounds) {
  group("notifications list polling", () => {
    for (let i = 0; i < rounds; i += 1) {
      const response = http.get(`${BASE_URL}/api/v1/notifications`, {
        headers: bearerHeaders(token),
      });
      check(response, {
        "notifications list status 200": (res) => res.status === 200,
      });
    }
  });
}

function requireToken(label) {
  const token = userToken();
  if (!token) {
    check(null, { [`${label} token 확보`]: () => false });
    return null;
  }
  return token;
}

export function notificationsSmokeJourney() {
  const token = requireToken("notifications smoke");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  pollNotifications(token, READ_ROUNDS);
  sleep(THINK_SECONDS);
}

export function notificationsPollerNormal() {
  const token = requireToken("notifications normal");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  pollNotifications(token, READ_ROUNDS);
  sleep(THINK_SECONDS);
}

export function notificationsPollerBurst() {
  const token = requireToken("notifications burst");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  const burstRounds = Math.max(READ_ROUNDS, 5);
  pollNotifications(token, burstRounds);
  sleep(THINK_SECONDS);
}

export default function () {
  notificationsSmokeJourney();
}
  sleep(THINK_SECONDS);
}
