import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "jpcouqqxeucbdkctidrn.supabase.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
