import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize barrel imports — avoids Turbopack chunk-loading issues with large icon libs
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // ── V1 route kills ── all old directory/provider routes redirect permanently ──
  async redirects() {
    return [
      // Pro provider dashboard (V1)
      { source: '/pro',                     destination: '/', permanent: true },
      { source: '/pro/dashboard',           destination: '/', permanent: true },
      { source: '/pro/reports',             destination: '/', permanent: true },
      { source: '/pro/reports/live',        destination: '/', permanent: true },
      { source: '/pro/bookings',            destination: '/', permanent: true },
      { source: '/pro/clients',             destination: '/', permanent: true },
      { source: '/pro/grooming',            destination: '/', permanent: true },
      { source: '/pro/profile',             destination: '/', permanent: true },
      { source: '/pro/leads',               destination: '/', permanent: true },
      { source: '/pro/fitness',             destination: '/', permanent: true },
      { source: '/pro/:path*',              destination: '/', permanent: true },
      // Provider directory listings (V1)
      { source: '/provider/:path*',         destination: '/', permanent: true },
      // Directory categories (V1)
      { source: '/dog-walking',             destination: '/', permanent: true },
      { source: '/grooming',                destination: '/', permanent: true },
      { source: '/pet-store',               destination: '/', permanent: true },
      { source: '/dog-training',            destination: '/', permanent: true },
      { source: '/veterinary',              destination: '/', permanent: true },
      { source: '/boarding',                destination: '/', permanent: true },
      // V1 features
      { source: '/broadcast',               destination: '/', permanent: true },
      { source: '/join',                    destination: '/', permanent: true },
      { source: '/join/success',            destination: '/', permanent: true },
      { source: '/join/pro/:path*',         destination: '/', permanent: true },
      { source: '/join-as-provider/:path*', destination: '/', permanent: true },
      { source: '/join-reports/:path*',     destination: '/', permanent: true },
      { source: '/become-a-provider',       destination: '/', permanent: true },
      { source: '/my-listing',              destination: '/my-account', permanent: true },
      { source: '/dashboard',               destination: '/home',       permanent: true },
      { source: '/onboarding',              destination: '/setup',      permanent: true },
      { source: '/search',                  destination: '/', permanent: true },
      { source: '/map',                     destination: '/', permanent: true },
      { source: '/insurance',               destination: '/', permanent: true },
      { source: '/review/:path*',           destination: '/', permanent: true },
      { source: '/live/:path*',             destination: '/', permanent: true },
    ]
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
