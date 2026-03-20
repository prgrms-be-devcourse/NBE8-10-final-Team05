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
  title: "maum_on",
  description: "maum_on frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
