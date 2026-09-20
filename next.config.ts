import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/lab",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
