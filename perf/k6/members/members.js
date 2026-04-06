/**
 * members 도메인 부하 테스트
 * - 기본: 내 정보 조회
 * - 옵션: 프로필 수정/랜덤수신 토글/이메일 변경(write share)
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { MODE, chance, normalizeBaseUrl, readBoolean, readNumber } from "../lib/env.js";
import { getAccessToken } from "../lib/auth.js";
import { bearerHeaders } from "../lib/http.js";
import {
  buildSegmentedModeOptions,
  resolveShare,
  resolveThinkSeconds,
} from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "members";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    members_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "membersSmokeJourney",
    },
  },
  load: {
    members_profile_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 38, duration: "2m" },
        { target: 38, duration: "5m" },
        { target: 75, duration: "2m" },
        { target: 75, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "membersProfileReader",
    },
    members_toggle_writer: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 9, duration: "2m" },
        { target: 9, duration: "5m" },
        { target: 19, duration: "2m" },
        { target: 19, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "membersToggleWriter",
    },
    members_profile_writer: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 3, duration: "2m" },
        { target: 3, duration: "5m" },
        { target: 6, duration: "2m" },
        { target: 6, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "membersProfileWriter",
    },
  },
  stress: {
    members_profile_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 70, duration: "3m" },
        { target: 150, duration: "7m" },
        { target: 230, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "membersProfileReader",
    },
    members_toggle_writer: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 15, duration: "3m" },
        { target: 35, duration: "7m" },
        { target: 55, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "membersToggleWriter",
    },
    members_profile_writer: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 5, duration: "3m" },
        { target: 12, duration: "7m" },
        { target: 20, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "membersProfileWriter",
    },
  },
};
const THINK_SECONDS = resolveThinkSeconds("MEMBERS", 0.5);
const ENABLE_WRITE =
  MODE === "smoke"
    ? readBoolean("MEMBERS_ENABLE_WRITE_SMOKE", true)
    : readBoolean("MEMBERS_ENABLE_WRITE", false);
const ENABLE_EMAIL_UPDATE = readBoolean("MEMBERS_ENABLE_EMAIL_UPDATE", false);
const defaultWriteShare = MODE === "smoke" ? 1 : MODE === "stress" ? 0.3 : 0.25;
const WRITE_SHARE = resolveShare("MEMBERS", "WRITE_SHARE", defaultWriteShare);

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("MEMBERS_P95_MS", 1000),
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

function readMe(token) {
  const response = http.get(`${BASE_URL}/api/v1/members/me`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "members me status 200": (res) => res.status === 200,
  });
}

function writeFlow(token) {
  const unique = Date.now();

  group("members write:profile", () => {
    const response = http.patch(
      `${BASE_URL}/api/v1/members/me/profile`,
      JSON.stringify({
        nickname: `k6_${unique % 100000}`,
      }),
      {
        headers: bearerHeaders(token),
      },
    );
    check(response, {
      "members profile update status 200": (res) => res.status === 200,
    });
  });

  group("members write:random-setting", () => {
    const response = http.patch(
      `${BASE_URL}/api/v1/members/me/random-setting`,
      null,
      {
        headers: bearerHeaders(token),
      },
    );
    check(response, {
      "members random-setting status 200": (res) => res.status === 200,
    });
  });

  if (ENABLE_EMAIL_UPDATE) {
    group("members write:email", () => {
      const response = http.patch(
        `${BASE_URL}/api/v1/members/me/email`,
        JSON.stringify({
          email: `k6-member-${unique}@maumon.local`,
        }),
        {
          headers: bearerHeaders(token),
        },
      );
      check(response, {
        "members email update handled": (res) => [200, 400, 409].includes(res.status),
      });
    });
  }
}

function requireToken(label) {
  const token = userToken();
  if (!token) {
    check(null, { [`${label} token 확보`]: () => false });
    return null;
  }
  return token;
}

export function membersSmokeJourney() {
  const token = requireToken("members smoke");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  group("members read:me", () => {
    readMe(token);
  });

  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    group("members write flow", () => {
      writeFlow(token);
    });
  }

  sleep(THINK_SECONDS);
}

export function membersProfileReader() {
  const token = requireToken("members reader");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  readMe(token);
  sleep(THINK_SECONDS);
}

export function membersToggleWriter() {
  const token = requireToken("members toggle");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  readMe(token);
  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    group("members toggle write", () => {
      const response = http.patch(
        `${BASE_URL}/api/v1/members/me/random-setting`,
        null,
        { headers: bearerHeaders(token) },
      );
      check(response, {
        "members random-setting status 200": (res) => res.status === 200,
      });
    });
  }
  sleep(THINK_SECONDS);
}

export function membersProfileWriter() {
  const token = requireToken("members profile");
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }
  readMe(token);
  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    writeFlow(token);
  }
  sleep(THINK_SECONDS);
}

export default function () {
  membersSmokeJourney();
}
