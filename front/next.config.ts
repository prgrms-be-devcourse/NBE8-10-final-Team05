import type { NextConfig } from "next";

function remotePatternFromApiBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl) {
    return null;
  }

  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/gen/**",
    };
  } catch {
    return null;
  }
}

const apiBasePattern = remotePatternFromApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
);
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' localhost:8080;",
            // 주의: 배포 환경에서는 'unsafe-eval'을 제거하는 것이 보안상 좋습니다.
          },
        ],
      },
    ];
  },

  reactCompiler: true,
  images: {
    // 로컬 환경(localhost, 127.0.0.1)의 이미지를 허용하기 위한 핵심 옵션
    unoptimized: process.env.NODE_ENV === "development",

    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/gen/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8080",
        pathname: "/gen/**",
      },
      ...(apiBasePattern ? [apiBasePattern] : []),
    ],
  },
};

export default nextConfig;
