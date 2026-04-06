/**
 * auth 도메인 부하 테스트
 * - smoke: 로그인 -> me -> refresh -> logout 여정 검증
 * - load/stress: 읽기 세션, refresh 세션, 재로그인 세션을 분리해 실사용 패턴 반영
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { MODE, normalizeBaseUrl, readBoolean, readNumber, readString } from "../lib/env.js";
import { getAccessToken, hasUserTokenPool, pickUserCredential } from "../lib/auth.js";
import { bearerHeaders, dataOf } from "../lib/http.js";
import {
  buildSegmentedModeOptions,
  resolveShare,
  resolveThinkSeconds,
} from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "auth";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    auth_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "authSmokeJourney",
    },
  },
  load: {
    auth_token_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 32, duration: "2m" },
        { target: 32, duration: "5m" },
        { target: 64, duration: "2m" },
        { target: 64, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "authTokenReader",
    },
    auth_refresh_session: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 14, duration: "2m" },
        { target: 14, duration: "5m" },
        { target: 27, duration: "2m" },
        { target: 27, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "authRefreshSession",
    },
    auth_login_cycle: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 4, duration: "2m" },
        { target: 4, duration: "5m" },
        { target: 9, duration: "2m" },
        { target: 9, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "authLoginCycle",
    },
  },
  stress: {
    auth_token_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 80, duration: "3m" },
        { target: 180, duration: "7m" },
        { target: 260, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "authTokenReader",
    },
    auth_refresh_session: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 40, duration: "3m" },
        { target: 90, duration: "7m" },
        { target: 140, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "authRefreshSession",
    },
    auth_login_cycle: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "3m" },
        { target: 30, duration: "7m" },
        { target: 60, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "authLoginCycle",
    },
  },
};
const THINK_SECONDS = resolveThinkSeconds("AUTH", 0.5);
const REFRESH_SHARE = resolveShare("AUTH", "REFRESH_SHARE", MODE === "stress" ? 0.4 : 0.3);
const ENABLE_LOGOUT =
  MODE === "smoke"
    ? readBoolean("AUTH_ENABLE_LOGOUT_SMOKE", true)
    : readBoolean("AUTH_ENABLE_LOGOUT", false);
const USE_TOKEN_POOL = readBoolean("AUTH_USE_TOKEN_POOL", true);

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("AUTH_P95_MS", 1200),
  SCENARIO_BY_MODE,
);
export const handleSummary = buildSummary(DOMAIN);

function loginWithCredential(credential, label = "user") {
  if (!credential) return null;

  const loginResponse = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: credential.email,
      password: credential.password,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  check(loginResponse, {
    [`${label} login status 200`]: (res) => res.status === 200,
    [`${label} login accessToken 응답`]: (res) => {
      const token = dataOf(res)?.accessToken;
      return typeof token === "string" && token.length > 0;
    },
  });
  return dataOf(loginResponse)?.accessToken || null;
}

function sessionFlow({ forceRefresh = false, forceLogout = false } = {}) {
  const credential = pickUserCredential();
  if (!credential) {
    check(null, {
      "auth credential 존재": () => false,
    });
    return;
  }

  group("auth session", () => {
    const accessToken = loginWithCredential(credential, "auth");
    if (!accessToken) return;

    group("auth me", () => {
      const meResponse = http.get(`${BASE_URL}/api/v1/auth/me`, {
        headers: bearerHeaders(accessToken),
      });
      check(meResponse, {
        "me status 200": (res) => res.status === 200,
      });
    });

    if (forceRefresh || MODE === "smoke" || Math.random() < REFRESH_SHARE) {
      group("auth refresh", () => {
        const refreshResponse = http.post(`${BASE_URL}/api/v1/auth/refresh`, null, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        check(refreshResponse, {
          "refresh status 200": (res) => res.status === 200,
        });
      });
    }

    if (forceLogout || ENABLE_LOGOUT) {
      group("auth logout", () => {
        const logoutResponse = http.post(`${BASE_URL}/api/v1/auth/logout`, null, {
          headers: {
            "Content-Type": "application/json",
          },
        });
        check(logoutResponse, {
          "logout status 200": (res) => res.status === 200,
        });
      });
    }
  });
}

function tokenPoolFlow() {
  const accessToken = getAccessToken(BASE_URL, {
    role: "user",
    preferTokenPool: true,
  });
  if (!accessToken) {
    check(null, {
      "access token 확보": () => false,
    });
    return;
  }

  group("auth me(token-pool)", () => {
    const response = http.get(`${BASE_URL}/api/v1/auth/me`, {
      headers: bearerHeaders(accessToken),
    });
    check(response, {
      "token-pool me status 200": (res) => res.status === 200,
    });
  });
}

export function authSmokeJourney() {
  sessionFlow({ forceRefresh: true, forceLogout: true });
  sleep(THINK_SECONDS);
}

export function authTokenReader() {
  if (USE_TOKEN_POOL && hasUserTokenPool()) {
    tokenPoolFlow();
  } else {
    const token = getAccessToken(BASE_URL, {
      role: "user",
      preferTokenPool: false,
    });
    if (!token) {
      check(null, { "auth token reader token 확보": () => false });
    } else {
      const response = http.get(`${BASE_URL}/api/v1/auth/me`, {
        headers: bearerHeaders(token),
      });
      check(response, { "auth token reader me 200": (res) => res.status === 200 });
    }
  }
  sleep(THINK_SECONDS);
}

export function authRefreshSession() {
  sessionFlow({ forceRefresh: true, forceLogout: false });
  sleep(THINK_SECONDS);
}

export function authLoginCycle() {
  sessionFlow({ forceRefresh: false, forceLogout: true });
  sleep(THINK_SECONDS);
}

export default function () {
  authSmokeJourney();
}
