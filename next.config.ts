import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Optimize barrel imports — avoids Turbopack chunk-loading issues with large icon libs
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Dev-only: lets a phone on the same WiFi load the dev server via its LAN IP.
  // Next.js blocks cross-origin HMR/dev-resource requests by default, which
  // otherwise renders the initial HTML shell fine but leaves the page empty
  // since client-side JS never finishes hydrating. Has zero effect on
  // production builds. Update the IP if your machine's local address changes.
  allowedDevOrigins: ['192.168.0.106'],

  // ── Route redirects ──────────────────────────────────────────────────────────
  // NOTE: /pro/*, /join/*, /become-a-provider, /review/*, /live/* are NOT
  // redirected here — they are protected in middleware.ts (admin-only access).
  // This lets the owner access V1 provider tools while blocking the public.
  async redirects() {
    return [
      // Dead V1 directory/marketplace routes — public never needs these
      { source: '/provider/:path*',         destination: '/', permanent: true },
      { source: '/dog-walking',             destination: '/', permanent: true },
      { source: '/grooming',                destination: '/', permanent: true },
      { source: '/pet-store',               destination: '/', permanent: true },
      { source: '/dog-training',            destination: '/', permanent: true },
      { source: '/veterinary',              destination: '/', permanent: true },
      { source: '/boarding',                destination: '/', permanent: true },
      { source: '/broadcast',               destination: '/', permanent: true },
      { source: '/my-listing',              destination: '/my-account', permanent: true },
      { source: '/dashboard',               destination: '/home',       permanent: true },
      { source: '/onboarding',              destination: '/setup',      permanent: true },
      { source: '/search',                  destination: '/', permanent: true },
      { source: '/map',                     destination: '/', permanent: true },
      { source: '/insurance',               destination: '/', permanent: true },
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
      {
        // Blog post cover photos
        protocol: 'https',
        hostname: 'images.unsplash.com',
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

export default withSentryConfig(nextConfig, {
  // Silence noisy Sentry build logs — the actual error capture doesn't need this
  silent: true,
  // No org/project auto-upload of source maps unless SENTRY_AUTH_TOKEN is set —
  // keeps the build working without requiring that secret right away. Stack
  // traces will just be minified until a token's added later.
});
