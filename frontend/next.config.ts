import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Tắt ESLint trong production build để deploy nhanh
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Tắt type checking trong build (tạm thời)
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/home",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
