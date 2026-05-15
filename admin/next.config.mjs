import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
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
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://localhost:3031/:path*',
      },
    ];
  },
}

export default nextConfig
