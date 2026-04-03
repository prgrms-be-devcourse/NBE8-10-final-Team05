/**
 * posts 도메인 부하 테스트
 * - 기본: 목록/상세 조회 중심
 * - 옵션: 작성/댓글/수정/해결상태/삭제(write share) 포함
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import {
  MODE,
  chance,
  normalizeBaseUrl,
  readBoolean,
  readNumber,
  randomInt,
} from "../lib/env.js";
import { getAccessToken } from "../lib/auth.js";
import { asArray, bearerHeaders, dataOf, firstNumericId } from "../lib/http.js";
import {
  buildSegmentedModeOptions,
  resolveShare,
  resolveThinkSeconds,
} from "../lib/options.js";
import { buildSummary } from "../lib/summary.js";

const DOMAIN = "posts";
const BASE_URL = normalizeBaseUrl("http://localhost:8080");
const SCENARIO_BY_MODE = {
  smoke: {
    posts_smoke_journey: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "2m",
      exec: "postsSmokeJourney",
    },
  },
  load: {
    posts_feed_reader: {
      executor: "constant-vus",
      vus: 220,
      duration: "20m",
      gracefulStop: "30s",
      exec: "postsFeedReader",
    },
    posts_detail_reader: {
      executor: "constant-vus",
      vus: 70,
      duration: "20m",
      gracefulStop: "30s",
      exec: "postsDetailReader",
    },
    posts_writer_light: {
      executor: "constant-vus",
      vus: 30,
      duration: "20m",
      gracefulStop: "30s",
      exec: "postsWriterLight",
    },
  },
  stress: {
    posts_feed_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 120, duration: "3m" },
        { target: 260, duration: "7m" },
        { target: 380, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "postsFeedReader",
    },
    posts_detail_reader: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 40, duration: "3m" },
        { target: 90, duration: "7m" },
        { target: 140, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "postsDetailReader",
    },
    posts_writer_light: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { target: 10, duration: "3m" },
        { target: 25, duration: "7m" },
        { target: 50, duration: "7m" },
        { target: 0, duration: "3m" },
      ],
      gracefulRampDown: "30s",
      exec: "postsWriterLight",
    },
  },
};
const PAGE_SIZE = readNumber("POSTS_PAGE_SIZE", 10);
const MAX_PAGE = readNumber("POSTS_MAX_PAGE", 30);
const THINK_SECONDS = resolveThinkSeconds("POSTS", 0.4);
const ENABLE_WRITE =
  MODE === "smoke"
    ? readBoolean("POSTS_ENABLE_WRITE_SMOKE", true)
    : readBoolean("POSTS_ENABLE_WRITE", false);
const defaultWriteShare = MODE === "smoke" ? 1 : MODE === "stress" ? 0.35 : 0.3;
const WRITE_SHARE = resolveShare("POSTS", "WRITE_SHARE", defaultWriteShare);
const CATEGORIES = ["DAILY", "WORRY", "QUESTION"];

export const options = buildSegmentedModeOptions(
  DOMAIN,
  readNumber("POSTS_P95_MS", 1000),
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

function getPosts(page) {
  const response = http.get(`${BASE_URL}/api/v1/posts?page=${page}&size=${PAGE_SIZE}`);
  check(response, {
    "posts list status 200": (res) => res.status === 200,
  });
  return asArray(dataOf(response)?.content);
}

function getPostDetail(postId) {
  const response = http.get(`${BASE_URL}/api/v1/posts/${postId}`);
  check(response, {
    "post detail status 200": (res) => res.status === 200,
  });
}

function getPostComments(postId) {
  const response = http.get(`${BASE_URL}/api/v1/posts/${postId}/comments?page=0&size=10`);
  check(response, {
    "post comments status 200": (res) => res.status === 200,
  });
}

function parseCommentIdFromLocation(response) {
  const location = response.headers?.Location || response.headers?.location;
  if (!location) return null;
  const match = location.match(/\/comments\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function writeFlow() {
  const accessToken = userToken();
  if (!accessToken) {
    check(null, {
      "posts write token 확보": () => false,
    });
    return;
  }

  const category = CATEGORIES[randomInt(CATEGORIES.length)];
  const unique = Date.now();

  let postId = null;
  group("posts write:create", () => {
    const response = http.post(
      `${BASE_URL}/api/v1/posts`,
      JSON.stringify({
        title: `k6-post-${unique}`,
        content: `k6 content ${unique}`,
        thumbnail: "",
        category,
      }),
      {
        headers: bearerHeaders(accessToken),
      },
    );
    check(response, {
      "post create status 200": (res) => res.status === 200,
      "post create id 응답": (res) => Number.isFinite(Number(dataOf(res))),
    });
    const created = Number(dataOf(response));
    postId = Number.isFinite(created) ? created : null;
  });

  if (!postId) return;

  let commentId = null;
  group("posts write:comment", () => {
    const response = http.post(
      `${BASE_URL}/api/v1/posts/${postId}/comments`,
      JSON.stringify({
        content: `k6 comment ${unique}`,
        parentCommentId: null,
      }),
      {
        headers: bearerHeaders(accessToken),
      },
    );
    check(response, {
      "comment create status 201": (res) => res.status === 201,
    });
    commentId = parseCommentIdFromLocation(response);
  });

  if (commentId) {
    group("posts write:comment-update", () => {
      const response = http.put(
        `${BASE_URL}/api/v1/comments/${commentId}`,
        JSON.stringify({
          content: `k6 comment updated ${unique}`,
        }),
        {
          headers: bearerHeaders(accessToken),
        },
      );
      check(response, {
        "comment update status 200": (res) => res.status === 200,
      });
    });
  }

  group("posts write:update", () => {
    const response = http.put(
      `${BASE_URL}/api/v1/posts/${postId}`,
      JSON.stringify({
        title: `k6-post-updated-${unique}`,
        content: `k6 content updated ${unique}`,
        thumbnail: "",
        category,
      }),
      {
        headers: bearerHeaders(accessToken),
      },
    );
    check(response, {
      "post update status 200": (res) => res.status === 200,
    });
  });

  group("posts write:resolution", () => {
    const response = http.patch(
      `${BASE_URL}/api/v1/posts/${postId}/resolution-status`,
      JSON.stringify({
        resolutionStatus: "RESOLVED",
      }),
      {
        headers: bearerHeaders(accessToken),
      },
    );
    check(response, {
      "resolution status update 200": (res) => res.status === 200,
    });
  });

  if (commentId) {
    group("posts write:comment-delete", () => {
      const response = http.del(`${BASE_URL}/api/v1/comments/${commentId}`, null, {
        headers: bearerHeaders(accessToken),
      });
      check(response, {
        "comment delete status 200": (res) => res.status === 200,
      });
    });
  }

  group("posts write:delete", () => {
    const response = http.del(`${BASE_URL}/api/v1/posts/${postId}`, null, {
      headers: bearerHeaders(accessToken),
    });
    check(response, {
      "post delete status 200": (res) => res.status === 200,
    });
  });
}

function readOnlyJourney({ withComments = false } = {}) {
  const page = randomInt(MAX_PAGE + 1);
  const posts = getPosts(page);
  const postId = firstNumericId(posts);

  if (postId) {
    getPostDetail(postId);
    if (withComments) {
      getPostComments(postId);
    }
  } else {
    const fallback = getPosts(0);
    const fallbackId = firstNumericId(fallback);
    if (fallbackId) {
      getPostDetail(fallbackId);
      if (withComments) {
        getPostComments(fallbackId);
      }
    }
  }
}

export function postsSmokeJourney() {
  const firstPagePosts = getPosts(0);
  const secondPagePosts = getPosts(1);
  const firstId = firstNumericId(firstPagePosts) ?? firstNumericId(secondPagePosts);

  if (firstId) {
    group("posts read:detail", () => {
      getPostDetail(firstId);
    });
  }

  if (ENABLE_WRITE && chance(WRITE_SHARE)) {
    group("posts write flow", () => {
      writeFlow();
    });
  }
  sleep(THINK_SECONDS);
}

export function postsFeedReader() {
  group("posts feed reader", () => {
    readOnlyJourney({ withComments: false });
  });
  sleep(THINK_SECONDS);
}

export function postsDetailReader() {
  group("posts detail reader", () => {
    readOnlyJourney({ withComments: true });
  });
  sleep(THINK_SECONDS);
}

export function postsWriterLight() {
  group("posts writer light", () => {
    readOnlyJourney({ withComments: true });
    if (ENABLE_WRITE && chance(WRITE_SHARE)) {
      writeFlow();
    }
  });
  sleep(THINK_SECONDS);
}

export default function () {
  postsSmokeJourney();
}
