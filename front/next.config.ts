import type { NextConfig } from "next";
import {
  getMonitoringProxyBaseUrl,
  getPublicApiBaseUrl,
  getServerApiBaseUrl,
  toUrlOrigin,
  toWebSocketOrigin,
} from "./src/lib/runtime/deployment-env";

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
      pathname:
        parsed.pathname && parsed.pathname !== "/"
          ? `${parsed.pathname.replace(/\/+$/, "")}/gen/**`
          : "/gen/**",
    };
  } catch {
    return null;
  }
}

function addIfPresent(values: Set<string>, value: string | null): void {
  if (value) {
    values.add(value);
  }
}

const publicApiBaseUrl = getPublicApiBaseUrl();
const serverApiBaseUrl = getServerApiBaseUrl();
const monitoringProxyBaseUrl = getMonitoringProxyBaseUrl();
const apiBasePattern = remotePatternFromApiBaseUrl(publicApiBaseUrl);
const connectSrcValues = new Set<string>(["'self'"]);
const imageSrcValues = new Set<string>(["'self'", "blob:", "data:"]);
const frameSrcValues = new Set<string>(["'self'"]);

addIfPresent(connectSrcValues, toUrlOrigin(publicApiBaseUrl));
addIfPresent(connectSrcValues, toWebSocketOrigin(publicApiBaseUrl));
addIfPresent(connectSrcValues, toUrlOrigin(monitoringProxyBaseUrl));
addIfPresent(connectSrcValues, toWebSocketOrigin(monitoringProxyBaseUrl));
addIfPresent(imageSrcValues, toUrlOrigin(publicApiBaseUrl));
addIfPresent(frameSrcValues, toUrlOrigin(monitoringProxyBaseUrl));

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  `connect-src ${Array.from(connectSrcValues).join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${Array.from(imageSrcValues).join(" ")}`,
  `frame-src ${Array.from(frameSrcValues).join(" ")}`,
].join("; ");

const nextConfig: NextConfig = {
  // 브라우저의 /api/v1 요청을 현재 런타임에 맞는 백엔드로 전달한다.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${serverApiBaseUrl}/api/v1/:path*`,
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
            value: contentSecurityPolicy,
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
