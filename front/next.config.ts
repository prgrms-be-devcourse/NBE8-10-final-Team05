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
  // [추가] 프록시 설정: 브라우저의 /api/v1 요청을 백엔드(8080)로 전달합니다.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8080/api/v1/:path*",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // connect-src에 self와 localhost:8080을 추가하여 API 및 SSE 통신 허용
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' localhost:8080; " +
              "connect-src 'self' http://localhost:8080 ws://localhost:3000; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' blob: data: localhost:8080;",
          },
        ],
      },
    ];
  },

  reactCompiler: true,
  images: {
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
