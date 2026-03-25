import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthBootstrap from "@/components/auth/AuthBootstrap";
import AuthStatusBar from "@/components/auth/AuthStatusBar";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthBootstrap />
        <AuthStatusBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
