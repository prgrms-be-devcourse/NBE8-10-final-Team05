/**
 * diary 도메인 부하 테스트
 * - 기본: 공개/내 일기 목록 + 상세 조회
 * - 옵션: multipart 생성/수정/삭제(write share)
 * - 주의: 일 1회 작성 제한이 있을 수 있어 load/stress는 read 중심 권장
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { FormData } from "https://jslib.k6.io/formdata/0.0.2/index.js";
import { MODE, chance, normalizeBaseUrl, readBoolean, readNumber } from "../lib/env.js";
import { getAccessToken } from "../lib/auth.js";
import { asArray, bearerHeaders, dataOf, firstNumericId } from "../lib/http.js";
import {
  buildSegmentedModeOptions,
  resolveShare,
  resolveThinkSeconds,
} from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "diary";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    diary_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "diarySmokeJourney",
    },
  },
  load: {
    diary_public_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 28, duration: "2m" },
        { target: 28, duration: "5m" },
        { target: 56, duration: "2m" },
        { target: 56, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "diaryPublicReader",
    },
    diary_my_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 17, duration: "2m" },
        { target: 17, duration: "5m" },
        { target: 33, duration: "2m" },
        { target: 33, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "diaryMyReader",
    },
    diary_writer_light: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 5, duration: "2m" },
        { target: 5, duration: "5m" },
        { target: 11, duration: "2m" },
        { target: 11, duration: "5m" },
        { target: 0, duration: "2m" },
      ],
      gracefulRampDown: "30s",
      exec: "diaryWriterLight",
    },
  },
  stress: {
    diary_public_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 60, duration: "3m" },
        { target: 140, duration: "7m" },
        { target: 220, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "diaryPublicReader",
    },
    diary_my_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 30, duration: "3m" },
        { target: 80, duration: "7m" },
        { target: 120, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "diaryMyReader",
    },
    diary_writer_light: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 8, duration: "3m" },
        { target: 18, duration: "7m" },
        { target: 36, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "diaryWriterLight",
    },
  },
};
const PAGE_SIZE = readNumber("DIARY_PAGE_SIZE", 10);
const THINK_SECONDS = resolveThinkSeconds("DIARY", 0.6);
const ENABLE_WRITE =
  MODE === "smoke"
    ? readBoolean("DIARY_ENABLE_WRITE_SMOKE", true)
    : readBoolean("DIARY_ENABLE_WRITE", false);
const defaultWriteShare = MODE === "smoke" ? 1 : MODE === "stress" ? 0.2 : 0.15;
const WRITE_SHARE = resolveShare("DIARY", "WRITE_SHARE", defaultWriteShare);
const PUBLIC_SHARE = readNumber("DIARY_PUBLIC_SHARE", 0.7);
const DELETE_AFTER_WRITE = readBoolean("DIARY_DELETE_AFTER_WRITE", false);

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("DIARY_P95_MS", 1500),
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

function buildDiaryFormData(payload) {
  const form = new FormData();
  form.append("data", http.file(JSON.stringify(payload), "data.json", "application/json"));
  return form;
}

function getPublicDiaries() {
  const response = http.get(`${BASE_URL}/api/v1/diaries/public?page=0&size=${PAGE_SIZE}`);
  check(response, {
    "public diary status 200|204": (res) => [200, 204].includes(res.status),
  });
  return asArray(dataOf(response)?.content);
}

function getMyDiaries(token) {
  const response = http.get(`${BASE_URL}/api/v1/diaries?page=0&size=${PAGE_SIZE}`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "my diary status 200": (res) => res.status === 200,
  });
  return asArray(dataOf(response)?.content);
}

function getDiaryDetail(token, diaryId) {
  const response = http.get(`${BASE_URL}/api/v1/diaries/${diaryId}`, {
    headers: bearerHeaders(token),
  });
  check(response, {
    "diary detail status 200": (res) => res.status === 200,
  });
}

function writeFlow(token) {
  const unique = Date.now();
  const payload = {
    title: `k6-diary-${unique}`,
    content: `k6 diary content ${unique}`,
    categoryName: "일상",
    isPrivate: Math.random() > PUBLIC_SHARE,
    imageUrl: "",
  };
  const createForm = buildDiaryFormData(payload);

  let diaryId = null;
  group("diary write:create", () => {
    const response = http.post(`${BASE_URL}/api/v1/diaries`, createForm.body(), {
      headers: {
        ...bearerHeaders(token, {}),
        "Content-Type": `multipart/form-data; boundary=${createForm.boundary}`,
      },
    });
    check(response, {
      "diary create server error 없음": (res) => res.status < 500,
    });
    const created = Number(dataOf(response));
    diaryId = Number.isFinite(created) ? created : null;
  });

  if (!diaryId) return;

  const updatePayload = {
    ...payload,
    title: `k6-diary-updated-${unique}`,
    content: `k6 diary content updated ${unique}`,
  };
  const updateForm = buildDiaryFormData(updatePayload);

  group("diary write:update", () => {
    const response = http.put(
      `${BASE_URL}/api/v1/diaries/${diaryId}`,
      updateForm.body(),
      {
        headers: {
          ...bearerHeaders(token, {}),
          "Content-Type": `multipart/form-data; boundary=${updateForm.boundary}`,
        },
      },
    );
    check(response, {
      "diary update server error 없음": (res) => res.status < 500,
    });
  });

  if (DELETE_AFTER_WRITE) {
    group("diary write:delete", () => {
      const response = http.del(`${BASE_URL}/api/v1/diaries/${diaryId}`, null, {
        headers: bearerHeaders(token),
      });
      check(response, {
        "diary delete server error 없음": (res) => res.status < 500,
      });
    });
  }
}

function diaryReadJourney() {
  const token = userToken();
  if (!token) {
    check(null, {
      "diary token 확보": () => false,
    });
    return null;
  }

  const publicDiaries = getPublicDiaries();
  const myDiaries = getMyDiaries(token);

  const detailId = firstNumericId(myDiaries) ?? firstNumericId(publicDiaries);
  if (detailId) {
    group("diary read:detail", () => {
      getDiaryDetail(token, detailId);
    });
  }

  return token;
}

export function diarySmokeJourney() {
  const token = diaryReadJourney();
  if (!token) {
    sleep(THINK_SECONDS);
    return;
  }

  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    group("diary write flow", () => {
      writeFlow(token);
    });
  }

  sleep(THINK_SECONDS);
}

export function diaryPublicReader() {
  const publicDiaries = getPublicDiaries();
  const detailId = firstNumericId(publicDiaries);
  if (detailId) {
    const token = userToken();
    if (token) {
      getDiaryDetail(token, detailId);
    }
  }
  sleep(THINK_SECONDS);
}

export function diaryMyReader() {
  const token = userToken();
  if (!token) {
    check(null, { "diary my reader token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  const myDiaries = getMyDiaries(token);
  const detailId = firstNumericId(myDiaries);
  if (detailId) {
    getDiaryDetail(token, detailId);
  }
  sleep(THINK_SECONDS);
}

export function diaryWriterLight() {
  const token = userToken();
  if (!token) {
    check(null, { "diary writer token 확보": () => false });
    sleep(THINK_SECONDS);
    return;
  }
  getMyDiaries(token);
  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    writeFlow(token);
  }
  sleep(THINK_SECONDS);
}

export default function () {
  diarySmokeJourney();
}
