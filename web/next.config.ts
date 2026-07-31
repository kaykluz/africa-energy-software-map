import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The site serves only repository-owned static imagery. Disabling runtime
    // optimisation removes an unused media-processing surface.
    unoptimized: true,
  },
};

export default nextConfig;
