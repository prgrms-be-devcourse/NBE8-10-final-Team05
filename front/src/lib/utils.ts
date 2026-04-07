import { getPublicApiBaseUrl, joinUrl } from "@/lib/runtime/deployment-env";

const API_BASE_URL = getPublicApiBaseUrl();

export const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";

  if (url.startsWith("http")) return url;

  return joinUrl(API_BASE_URL, url);
};
