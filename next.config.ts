import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output para correr en Docker/Cloud Run sin node_modules completos
  output: "standalone",
};

export default nextConfig;
