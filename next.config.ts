import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses (gzip/brotli)
  compress: true,

  images: {
    // Serve WebP/AVIF automatically for <Image> components
    formats: ['image/avif', 'image/webp'],
    // Keep optimized images in cache for 30 days
    minimumCacheTTL: 2592000,
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

  // Long-cache headers for static assets
  async headers() {
    return [
      {
        // Static files in /public — fonts, images, icons
        source: '/(.*\\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next.js static chunks
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
