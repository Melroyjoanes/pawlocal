import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize barrel imports — avoids Turbopack chunk-loading issues with large icon libs
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

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
  // Note: Next.js header sources use path-to-regexp syntax — no capturing groups.
  // /_next/static/ chunks are already immutable-cached by Vercel automatically.
  // Public folder images/fonts use :path* wildcard.
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    return [
      // Only set immutable cache on static chunks in production.
      // In dev, Turbopack regenerates chunks with new content — immutable headers
      // cause browsers to serve stale chunks and break HMR.
      ...(isProd ? [{
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      }] : []),
      {
        // Public images (logo, icons, etc.)
        source: '/:path*.webp',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*.svg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Web fonts
        source: '/:path*.woff2',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
};

export default nextConfig;
