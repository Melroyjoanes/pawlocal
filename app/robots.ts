import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin', '/api']

  // The wildcard rule already permits these, but naming the AI crawlers makes
  // the intent explicit and keeps them allowed if the wildcard is ever tightened.
  // Being crawlable is a precondition for being cited by an assistant; it is not
  // on its own a reason to be cited. See public/llms.txt for the summary they read.
  const aiCrawlers = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-User', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai',
  ]

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...aiCrawlers.map(userAgent => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/sitemap.xml`,
  }
}
