import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Removed for Vercel - enables API routes
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
