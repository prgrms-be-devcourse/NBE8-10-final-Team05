// 수정 전: url이 null일 때 null을 반환하거나 타입이 불분명함
// 수정 후:
export const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) return ""; // null이나 undefined일 경우 빈 문자열 반환 (src 에러 방지)

  if (url.startsWith("http")) return url;

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
  return `${baseUrl}${url}`;
};
