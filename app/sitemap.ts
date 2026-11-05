import { MetadataRoute } from 'next';
import { getAllProducts } from '@/lib/products';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://drrias.in';
  const products = await getAllProducts();
  const buildDate = '2026-11-02';

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: buildDate,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const policyEntries: MetadataRoute.Sitemap = ['shipping', 'returns', 'privacy', 'terms'].map(
    (policy) => ({
      url: `${baseUrl}/policies/${policy}`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    })
  );

  return [
    {
      url: baseUrl,
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: buildDate,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: buildDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...productEntries,
    ...policyEntries,
  ];
}
