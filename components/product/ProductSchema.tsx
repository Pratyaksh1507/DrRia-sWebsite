import { Product } from '@/data/products';
import { getSiteUrl } from '@/lib/site-url';

export default function ProductSchema({ product }: { product: Product }) {
  const baseUrl = getSiteUrl();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((img) => `${baseUrl}${img.src}`),
    brand: {
      '@type': 'Brand',
      name: "Dr Ria's",
    },
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: "Dr Ria's",
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
