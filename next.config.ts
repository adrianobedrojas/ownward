import type { NextConfig } from "next";
import { getAllowedDevOrigins } from "./lib/config";

const allowedOrigins = getAllowedDevOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedOrigins,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
};

export default nextConfig;