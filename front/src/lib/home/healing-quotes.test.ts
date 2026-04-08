import { describe, expect, it } from "vitest";
import {
  HEALING_QUOTES,
  getHourlyHealingQuote,
  getKstHourlyQuoteIndex,
  getMillisecondsUntilNextKstHour,
} from "@/lib/home/healing-quotes";

describe("healing-quotes", () => {
  it("모든 문장에 원문과 출처 정보가 포함된다", () => {
    expect(HEALING_QUOTES.length).toBeGreaterThanOrEqual(24);

    for (const quote of HEALING_QUOTES) {
      expect(quote.originalQuote).toBeTruthy();
      expect(quote.sourceTitle).toBeTruthy();
      expect(quote.sourceUrl.startsWith("https://")).toBe(true);
    }
  });

  it("같은 KST 시간대에서는 같은 문장을 선택한다", () => {
    const early = new Date("2026-04-08T00:15:00.000Z");
    const late = new Date("2026-04-08T00:45:00.000Z");

    expect(getKstHourlyQuoteIndex(early)).toBe(getKstHourlyQuoteIndex(late));
    expect(getHourlyHealingQuote(early)).toEqual(getHourlyHealingQuote(late));
  });

  it("KST 시간이 바뀌면 다음 문장으로 넘어간다", () => {
    const beforeBoundary = new Date("2026-04-08T00:59:59.000Z");
    const afterBoundary = new Date("2026-04-08T01:00:00.000Z");

    expect(getKstHourlyQuoteIndex(beforeBoundary)).not.toBe(
      getKstHourlyQuoteIndex(afterBoundary),
    );
  });

  it("다음 KST 정각까지 남은 시간을 밀리초로 계산한다", () => {
    const date = new Date("2026-04-08T00:59:30.000Z");

    expect(getMillisecondsUntilNextKstHour(date)).toBe(30_000);
  });
});
