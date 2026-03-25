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

const apiBasePattern = remotePatternFromApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8080", pathname: "/gen/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8080", pathname: "/gen/**" },
      ...(apiBasePattern ? [apiBasePattern] : []),
    ],
  },
};

export default nextConfig;
