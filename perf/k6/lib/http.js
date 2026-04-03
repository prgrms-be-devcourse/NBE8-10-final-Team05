export function jsonOrNull(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

export function dataOf(response) {
  const body = jsonOrNull(response);
  return body?.data ?? null;
}

export function bearerHeaders(accessToken, extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function firstNumericId(items) {
  const list = asArray(items);
  const first = list.find((item) => Number.isFinite(Number(item?.id)));
  if (!first) return null;
  return Number(first.id);
}

export function httpOk(response, okStatuses = [200]) {
  return okStatuses.includes(response.status);
}
