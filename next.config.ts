import type { NextConfig } from "next";

// Validates the environment before anything else runs. A bad .env fails the
// build and the dev server here, not on a request in production.
import "./src/lib/env";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
