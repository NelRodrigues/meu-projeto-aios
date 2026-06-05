import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '/Users/admin/PROJECTOS/ISILDA',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'achtvzbcczmcbvjkdjry.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
