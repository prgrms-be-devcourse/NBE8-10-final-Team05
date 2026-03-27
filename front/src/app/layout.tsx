import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import AuthHintProvider from "@/components/auth/AuthHintProvider";
import SiteFooter from "@/components/layout/SiteFooter";
import {
  AUTH_HINT_COOKIE_NAME,
  parseAuthHintCookieValue,
} from "@/lib/auth/auth-hint-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "마음온",
  description: "마음을 나누는 이야기와 편지를 위한 공간",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const authHint = parseAuthHintCookieValue(
    cookieStore.get(AUTH_HINT_COOKIE_NAME)?.value,
  );

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthHintProvider initialAuthHint={authHint}>
          <AuthBootstrap />
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </AuthHintProvider>
      </body>
    </html>
  );
}
