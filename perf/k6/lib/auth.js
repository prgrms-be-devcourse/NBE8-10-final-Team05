import http from "k6/http";
import { check } from "k6";
import { pickByVu, readNumber, readString } from "./env.js";
import { dataOf } from "./http.js";

const K6_FIXED_USER_PASSWORD = "Maumon!2026#LoadTest";
const K6_FIXED_ADMIN_PASSWORD = "Maumon!2026#LoadTest";

function buildGeneratedPool({
  prefix,
  count,
  domain,
  password,
}) {
  if (!password) return [];

  const safePrefix = String(prefix || "").trim();
  const safeDomain = String(domain || "").trim();
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  if (!safePrefix || !safeDomain || safeCount <= 0) return [];

  return Array.from({ length: safeCount }, (_, idx) => {
    const serial = String(idx + 1).padStart(4, "0");
    return {
      email: `${safePrefix}-${serial}@${safeDomain}`,
      password,
    };
  });
}

function loadUserCredentials() {
  return buildGeneratedPool({
    prefix: readString("AUTH_USER_PREFIX", "k6-user"),
    count: readNumber("AUTH_USER_COUNT", 500),
    domain: readString("AUTH_USER_DOMAIN", "k6.maumon.local"),
    password: K6_FIXED_USER_PASSWORD,
  });
}

function loadAdminCredentials() {
  return buildGeneratedPool({
    prefix: readString("ADMIN_USER_PREFIX", "k6-admin"),
    count: readNumber("ADMIN_USER_COUNT", 3),
    domain: readString("ADMIN_USER_DOMAIN", "admin.maumon.local"),
    password: K6_FIXED_ADMIN_PASSWORD,
  });
}

const userCredentials = loadUserCredentials();
const adminCredentials = loadAdminCredentials();

export function hasUserTokenPool() {
  return false;
}

export function hasAdminTokenPool() {
  return false;
}

export function pickUserCredential() {
  return pickByVu(userCredentials, null);
}

export function pickAdminCredential() {
  return pickByVu(adminCredentials, null);
}

export function pickUserToken() {
  return null;
}

export function pickAdminToken() {
  return null;
}

export function loginAndGetAccessToken(baseUrl, credential, label = "user") {
  if (!credential) return null;

  const response = http.post(
    `${baseUrl}/api/v1/auth/login`,
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

  check(response, {
    [`${label} 로그인 응답 코드`]: (res) => res.status === 200,
    [`${label} 로그인 access token 응답`]: (res) => {
      const token = dataOf(res)?.accessToken;
      return typeof token === "string" && token.length > 0;
    },
  });

  const token = dataOf(response)?.accessToken;
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  return token;
}

export function getAccessToken(baseUrl, { role = "user", preferTokenPool = true } = {}) {
  void preferTokenPool;
  const isAdmin = role === "admin";

  const credential = isAdmin ? pickAdminCredential() : pickUserCredential();
  return loginAndGetAccessToken(baseUrl, credential, isAdmin ? "admin" : "user");
}
