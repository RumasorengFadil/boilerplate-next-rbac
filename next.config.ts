import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Uploaded covers bypass the optimizer; never allow it to cache private media.
  images: { localPatterns: [{ pathname: "/images/**" }] },
};

export default nextConfig;
