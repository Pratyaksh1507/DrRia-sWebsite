import { Product } from '@/data/products';

export default function ProductSchema({ product }: { product: Product }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((img) => `https://drrias.in${img.src}`),
    brand: {
      '@type': 'Brand',
      name: "Dr Ria's",
    },
    sku: product.id,
    offers: {
      '@type': 'Offer',
      url: `https://drrias.in/products/${product.slug}`,
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
