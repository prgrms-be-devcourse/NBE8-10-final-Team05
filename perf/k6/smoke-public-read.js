import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = (__ENV.BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export const options = {
  scenarios: {
    public_read_smoke: {
      executor: "shared-iterations",
      vus: Number(__ENV.VUS ?? 1),
      iterations: Number(__ENV.ITERATIONS ?? 12),
      maxDuration: __ENV.MAX_DURATION ?? "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
  tags: {
    app: "maum-on",
    suite: "smoke",
  },
};

function extractContent(response) {
  try {
    const body = response.json();
    return Array.isArray(body?.data?.content) ? body.data.content : [];
  } catch {
    return [];
  }
}

function getFirstPostId(response) {
  const posts = extractContent(response);
  const firstPost = posts.find((post) => typeof post?.id === "number");
  return firstPost?.id ?? null;
}

export default function () {
  let firstPostId = null;

  group("posts list", () => {
    const response = http.get(`${BASE_URL}/api/v1/posts?page=0&size=5`);
    check(response, {
      "posts list returns 200": (res) => res.status === 200,
      "posts list returns slice content": (res) => Array.isArray(extractContent(res)),
    });

    firstPostId = getFirstPostId(response);
  });

  group("posts list compact", () => {
    const response = http.get(`${BASE_URL}/api/v1/posts?page=0&size=1`);
    check(response, {
      "compact posts list returns 200": (res) => res.status === 200,
      "compact posts list returns slice content": (res) =>
        Array.isArray(extractContent(res)),
    });
  });

  if (firstPostId !== null) {
    group("post detail", () => {
      const response = http.get(`${BASE_URL}/api/v1/posts/${firstPostId}`);
      check(response, {
        "post detail returns 200": (res) => res.status === 200,
        "post detail includes id": (res) => {
          try {
            return typeof res.json()?.data?.id === "number";
          } catch {
            return false;
          }
        },
      });
    });
  }

  sleep(Number(__ENV.SLEEP_SECONDS ?? 1));
}
