import exec from "k6/execution";

export const MODE = readString("MODE", "smoke").toLowerCase();

export function readString(name, fallback = "") {
  const raw = __ENV[name];
  if (raw === undefined || raw === null) {
    return fallback;
  }

  const value = String(raw).trim();
  return value === "" ? fallback : value;
}

export function readNumber(name, fallback = 0) {
  const value = Number(readString(name, `${fallback}`));
  return Number.isFinite(value) ? value : fallback;
}

export function readBoolean(name, fallback = false) {
  const normalized = readString(name, "").toLowerCase();
  if (normalized === "") return fallback;
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

export function readCsv(name, fallback = []) {
  const raw = readString(name, "");
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function readJson(name, fallback = null) {
  const raw = readString(name, "");
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function normalizeBaseUrl(input) {
  return readString("BASE_URL", input || "http://localhost:8080").replace(/\/+$/, "");
}

export function scopedKey(domain, suffix) {
  return `${domain.toUpperCase()}_${suffix}`;
}

export function scopedString(domain, suffix, fallback = "") {
  return readString(scopedKey(domain, suffix), fallback);
}

export function scopedNumber(domain, suffix, fallback = 0) {
  return readNumber(scopedKey(domain, suffix), fallback);
}

export function scopedBoolean(domain, suffix, fallback = false) {
  return readBoolean(scopedKey(domain, suffix), fallback);
}

export function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function chance(rate) {
  return Math.random() < clamp01(rate);
}

export function randomInt(max) {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.floor(Math.random() * max);
}

export function pickByVu(pool, fallback = null) {
  if (!Array.isArray(pool) || pool.length === 0) return fallback;
  const vu = Number(exec.vu?.idInTest || 1);
  const idx = (vu - 1) % pool.length;
  return pool[idx];
}
