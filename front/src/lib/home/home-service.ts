import { requestData } from "@/lib/api/http-client";

export interface HomeStats {
  todayWorryCount: number;
  todayLetterCount: number;
  todayDiaryCount: number;
}

const HOME_STATS_PATH = "/api/v1/home/stats";

export async function getHomeStats(): Promise<HomeStats> {
  return requestData<HomeStats>(HOME_STATS_PATH, {
    skipAuth: true,
    retryOnAuthFailure: false,
    authFailureRedirect: false,
  });
}
