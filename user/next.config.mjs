import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** โหลด user/.env.local ก่อนอ่าน config — กันค่า NEXT_PUBLIC_* หายเมื่อ turbopack root = monorepo */
nextEnv.loadEnvConfig(__dirname);
/** root ของ monorepo — ให้ import `@boxphon/shared` (../shared) อยู่ภายในขอบ Turbopack */
const monorepoRoot = path.join(__dirname, "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    externalDir: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
