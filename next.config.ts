import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage — walk report photos, provider photos, etc.
        protocol: 'https',
        hostname: 'sztzzplmdbxlmvoqpqra.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Supabase Storage CDN (legacy URL pattern)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
