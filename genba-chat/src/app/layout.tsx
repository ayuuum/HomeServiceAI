import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomTabNav } from "@/components/BottomTabNav";
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
  title: "GenbaChat（仮称）",
  description: "現場チームのための動画マニュアル × コミュニケーションアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <div className="mx-auto min-h-screen max-w-lg bg-[#f7f7f7] pb-16">
          {children}
        </div>
        <BottomTabNav />
      </body>
    </html>
  );
}
