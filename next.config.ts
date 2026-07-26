import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "shiny-happiness-gxxpqxj79rwxhp5g-3000.app.github.dev",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "shiny-happiness-gxxpqxj79rwxhp5g-3000.app.github.dev",
      ],
    },
  },
};

export default nextConfig;