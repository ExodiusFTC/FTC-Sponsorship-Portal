import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /@prisma\/instrumentation/ },
      { message: /Critical dependency: the request of a dependency is an expression/ }
    ];
    return config;
  },
};

export default nextConfig;
