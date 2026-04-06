/**
 * letters 도메인 부하 테스트
 * - 기본: 받은함/보낸함/상세/통계 조회
 * - 옵션: 편지 작성 + 작성상태 갱신 + 상태 조회
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { MODE, chance, normalizeBaseUrl, readBoolean, readNumber } from "../lib/env.js";
import { getAccessToken } from "../lib/auth.js";
import { asArray, bearerHeaders, dataOf, firstNumericId } from "../lib/http.js";
import {
  buildSegmentedModeOptions,
  resolveShare,
  resolveThinkSeconds,
} from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "letters";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    letters_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "lettersSmokeJourney",
    },
  },
  load: {
    letters_inbox_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 33, duration: "2m" },
        { target: 33, duration: "5m" },
        { target: 65, duration: "2m" },
        { target: 65, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "lettersInboxReader",
    },
    letters_sent_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 11, duration: "2m" },
        { target: 11, duration: "5m" },
        { target: 23, duration: "2m" },
        { target: 23, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "lettersSentReader",
    },
    letters_writer_light: {
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
      exec: "lettersWriterLight",
    },
  },
  stress: {
    letters_inbox_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 90, duration: "3m" },
        { target: 210, duration: "7m" },
        { target: 320, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "lettersInboxReader",
    },
    letters_sent_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 30, duration: "3m" },
        { target: 70, duration: "7m" },
        { target: 110, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "lettersSentReader",
    },
    letters_writer_light: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "3m" },
        { target: 25, duration: "7m" },
        { target: 45, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "lettersWriterLight",
    },
  },
};
const PAGE_SIZE = readNumber("LETTERS_PAGE_SIZE", 10);
const THINK_SECONDS = resolveThinkSeconds("LETTERS", 0.5);
const ENABLE_WRITE =
  MODE === "smoke"
    ? readBoolean("LETTERS_ENABLE_WRITE_SMOKE", true)
    : readBoolean("LETTERS_ENABLE_WRITE", false);
const ENABLE_ACCEPT = readBoolean("LETTERS_ENABLE_ACCEPT", false);
const defaultWriteShare = MODE === "smoke" ? 1 : MODE === "stress" ? 0.3 : 0.25;
const WRITE_SHARE = resolveShare("LETTERS", "WRITE_SHARE", defaultWriteShare);

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("LETTERS_P95_MS", 1200),
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

function getReceived(token) {
  const response = http.get(
    `${BASE_URL}/api/v1/letters/received?page=0&size=${PAGE_SIZE}`,
    {
      headers: bearerHeaders(token),
    },
  );
  check(response, {
    "received status 200": (res) => res.status === 200,
  });
  return asArray(dataOf(response)?.letters);
}

function getSent(token) {
  const response = http.get(`${BASE_URL}/api/v1/letters/sent?page=0&size=${PAGE_SIZE}`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "sent status 200": (res) => res.status === 200,
  });
  return asArray(dataOf(response)?.letters);
}

function getStats(token) {
  const response = http.get(`${BASE_URL}/api/v1/letters/stats`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "letters stats status 200": (res) => res.status === 200,
  });
}

function getDetail(token, letterId) {
  const response = http.get(`${BASE_URL}/api/v1/letters/${letterId}`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "letter detail status 200": (res) => res.status === 200,
  });
}

function writeFlow(token) {
  const unique = Date.now();
  let createdId = null;

  group("letters write:create", () => {
    const response = http.post(
      `${BASE_URL}/api/v1/letters`,
      JSON.stringify({
        title: `k6-letter-${unique}`,
        content: `k6 letter content ${unique}`,
      }),
      {
        headers: bearerHeaders(token),
      },
    );
    check(response, {
      "letter create status 200": (res) => res.status === 200,
      "letter create id 응답": (res) => Number.isFinite(Number(dataOf(res))),
    });
    const id = Number(dataOf(response));
    createdId = Number.isFinite(id) ? id : null;
  });

  if (!createdId) return;

  group("letters write:writing", () => {
    const response = http.post(
      `${BASE_URL}/api/v1/letters/${createdId}/writing`,
      null,
      {
        headers: bearerHeaders(token),
      },
    );
    check(response, {
      "letter writing status 200": (res) => res.status === 200,
    });
  });

  group("letters write:status", () => {
    const response = http.get(`${BASE_URL}/api/v1/letters/${createdId}/status`, {
      headers: bearerHeaders(token),
    });
    check(response, {
      "letter status status 200": (res) => res.status === 200,
    });
  });
}

function mailboxReadJourney(token, { preferSent = false } = {}) {
  const received = getReceived(token);
  const sent = getSent(token);
  getStats(token);

  const detailId = preferSent
    ? firstNumericId(sent) ?? firstNumericId(received)
    : firstNumericId(received) ?? firstNumericId(sent);
  if (detailId) {
    getDetail(token, detailId);
    if (ENABLE_ACCEPT && chance(0.1)) {
      const response = http.post(`${BASE_URL}/api/v1/letters/${detailId}/accept`, null, {
        headers: bearerHeaders(token),
      });
      check(response, {
        "letter accept handled": (res) => [200, 400, 403, 404].includes(res.status),
      });
    }
  }
}

export function lettersSmokeJourney() {
  const token = userToken();
  if (!token) {
    check(null, {
      "letters token 확보": () => false,
    });
    sleep(THINK_SECONDS);
    return;
  }

  group("letters smoke read", () => {
    mailboxReadJourney(token, { preferSent: false });
  });

  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    group("letters write flow", () => {
      writeFlow(token);
    });
  }

  sleep(THINK_SECONDS);
}

export function lettersInboxReader() {
  const token = userToken();
  if (!token) {
    check(null, { "letters inbox token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  group("letters inbox reader", () => {
    mailboxReadJourney(token, { preferSent: false });
  });
  sleep(THINK_SECONDS);
}

export function lettersSentReader() {
  const token = userToken();
  if (!token) {
    check(null, { "letters sent token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  group("letters sent reader", () => {
    mailboxReadJourney(token, { preferSent: true });
  });
  sleep(THINK_SECONDS);
}

export function lettersWriterLight() {
  const token = userToken();
  if (!token) {
    check(null, { "letters writer token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  group("letters writer light", () => {
    mailboxReadJourney(token, { preferSent: false });
    if (ENABLE_WRITE && chance(WRITE_SHARE)) {
      writeFlow(token);
    }
  });
  sleep(THINK_SECONDS);
}

export default function () {
  lettersSmokeJourney();
}
