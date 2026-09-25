import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 127.0.0.1 is a different dev origin from localhost. Allow it so the
  // preview hydrates when opened at that host.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
