import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const mono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "가맹 권유 지도",
  description: "춘천 아동급식카드: 학교 가까이 있는 미가맹 식당 중 가맹을 권할 곳",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={mono.variable}>{children}</body>
    </html>
  );
}
