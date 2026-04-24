import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      // This repo has been hitting repeated local pack-cache corruption under
      // `.next/dev/cache/webpack`, which then takes route manifests down with it.
      // Disabling the persistent webpack cache in dev keeps localhost stable.
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;
