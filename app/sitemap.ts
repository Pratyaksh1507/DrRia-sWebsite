import { MetadataRoute } from 'next';
import { getAllProducts } from '@/data/products';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://drrias.in';
  const products = getAllProducts();

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const policyEntries: MetadataRoute.Sitemap = ['shipping', 'returns', 'privacy', 'terms'].map(
    (policy) => ({
      url: `${baseUrl}/policies/${policy}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    })
  );

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...productEntries,
    ...policyEntries,
  ];
}
