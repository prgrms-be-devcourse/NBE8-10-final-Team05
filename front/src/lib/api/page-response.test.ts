import { describe, expect, it } from "vitest";

import { resolvePageContent, resolveTotalElements } from "./page-response";

describe("page-response", () => {
  it("totalElements가 있으면 그대로 사용한다", () => {
    expect(
      resolveTotalElements({
        totalElements: 17,
        numberOfElements: 10,
        content: Array.from({ length: 10 }, (_, index) => index),
      }),
    ).toBe(17);
  });

  it("totalElements가 없으면 numberOfElements로 보정한다", () => {
    expect(
      resolveTotalElements({
        numberOfElements: 9,
        content: Array.from({ length: 9 }, (_, index) => index),
      }),
    ).toBe(9);
  });

  it("카운트 메타데이터가 없으면 content 길이로 보정한다", () => {
    expect(
      resolveTotalElements({
        content: Array.from({ length: 4 }, (_, index) => index),
      }),
    ).toBe(4);
  });

  it("content가 배열이 아니면 빈 배열로 처리한다", () => {
    expect(resolvePageContent<number>(undefined)).toEqual([]);
    expect(resolvePageContent<number>({ content: undefined })).toEqual([]);
  });
});
