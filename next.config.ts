import type { NextConfig } from "next";

// 정적 사이트로 내보낸다(npm run build → out/). 서버 없이 Vercel·Netlify·GitHub Pages에 올릴 수 있다.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
