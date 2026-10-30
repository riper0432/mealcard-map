import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "@seed-design/css/all.layered.css"; // 당근 SEED Design 토큰·부품 스타일 (Apache-2.0)
import "./globals.css";

const mono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "가맹 권유 지도",
  description: "춘천 아동급식카드: 학교 가까이 있는 미가맹 식당 중 가맹을 권할 곳",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-seed-color-mode="light-only" data-seed-user-color-scheme="light">
      <head>
        {/* 한글 폰트 Pretendard(SIL OFL). 쓰는 글자만 받아오는 동적 서브셋 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className={mono.variable}>{children}</body>
    </html>
  );
}
