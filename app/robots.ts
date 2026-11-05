import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/checkout', '/thank-you', '/admin', '/admin/*', '/api/admin/*'],
    },
    sitemap: 'https://drrias.in/sitemap.xml',
  };
}
