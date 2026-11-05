import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/checkout', '/thank-you', '/admin', '/admin/*', '/api/admin/*'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
