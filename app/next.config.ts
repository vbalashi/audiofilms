import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    cpus: Number(process.env.NEXT_BUILD_CPUS || 1),
  },
};

export default nextConfig;
