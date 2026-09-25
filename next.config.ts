import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 127.0.0.1 is a different dev origin from localhost. Allow it so the
  // preview hydrates when opened at that host.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      // Profile photos are capped at 5 MB; leave room for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
