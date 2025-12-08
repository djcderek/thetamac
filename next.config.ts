import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Fly.io deployment
  output: "standalone",
};

export default nextConfig;
