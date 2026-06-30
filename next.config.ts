import type { NextConfig } from "next";

// Для GitHub Pages приложение собирается как статический сайт.
// basePath задаётся только в CI (имя репозитория), локально пусто.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
};

export default nextConfig;
