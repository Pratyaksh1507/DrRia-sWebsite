import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllProducts, getProductBySlug, getRelatedProducts } from '@/lib/products';
import ProductGallery from '@/components/product/ProductGallery';
import ProductActions from '@/components/product/ProductActions';
import ProductAccordions from '@/components/product/ProductAccordions';
import ProductSchema from '@/components/product/ProductSchema';
import ProductCard from '@/components/ui/ProductCard';
import { getSiteUrl } from '@/lib/site-url';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  'use cache';
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  const primaryImg = product.images[0]?.src || '/images/hydroboost-moisturizer-lifestyle-768.webp';

  return {
    title: product.size ? `${product.name} (${product.size})` : product.name,
    description: `${product.tagline}. ${product.description}`,
    openGraph: {
      title: `${product.name} | Dr Ria's`,
      description: product.description,
      url: `${getSiteUrl()}/products/${product.slug}`,
      images: [
        {
          url: primaryImg,
          width: 768,
          height: 768,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Dr Ria's`,
      description: product.tagline,
      images: [primaryImg],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  'use cache';
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.isActive === false) {
    notFound();
  }

  const related = await getRelatedProducts(product.slug, 3);

  return (
    <>
      <ProductSchema product={product} />
      {product.images[0] && (
        <link
          rel="preload"
          as="image"
          type="image/avif"
          imageSrcSet={product.images[0].avifSrcSet}
          imageSizes="(max-width: 768px) 100vw, 50vw"
          fetchPriority="high"
        />
      )}

      <div className="py-8 sm:py-12 bg-[#FBF6EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-xs text-[#6B6B6B] mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#5C3D1E]">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-[#5C3D1E]">
              Shop
            </Link>
            <span>/</span>
            <span className="text-[#1A1A1A] font-medium truncate">{product.name}</span>
          </nav>

          {/* Main PDP Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            {/* Gallery Column */}
            <div className="lg:col-span-7">
              <ProductGallery images={product.images} productName={product.name} />
            </div>

            {/* Info & Buying Column */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-white"
                    style={{ backgroundColor: product.accentColor }}
                  >
                    {product.categoryLabel}
                  </span>
                  {product.size && (
                    <span className="text-xs font-medium text-[#6B6B6B]">
                      Volume: {product.size}
                    </span>
                  )}
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A1A1A] leading-tight">
                  {product.name}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#5C3D1E] font-medium">
                  {product.tagline}
                </p>
              </div>

              {/* Price Row (Rendered in Server HTML for crawlers and shopping agents) */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5] flex items-baseline justify-between shadow-2xs">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-[#6B6B6B]">
                    Price (Incl. of all taxes)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-[#5C3D1E]">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    {product.mrp && product.mrp > product.price && (
                      <>
                        <span className="text-sm line-through text-[#6B6B6B]/80">
                          ₹{product.mrp.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-bold text-[#C9952A]">
                          {product.discountPercentage || Math.round(((product.mrp - product.price) / product.mrp) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {product.inStock ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EDF6EE] text-[#3A7D44]">
                    {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5
                      ? `Only ${product.stockQuantity} left &bull; Dispatches in 24h`
                      : 'In Stock &bull; Dispatches in 24h'}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                {product.description}
              </p>

              {/* Actions: Add to Cart, Buy Now, WhatsApp */}
              <ProductActions product={product} />

              {/* Accordions */}
              <ProductAccordions product={product} />

              {/* Compliance & Patch Test Advisory */}
              <div className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5] text-xs text-[#6B6B6B] space-y-1">
                <span className="font-bold text-[#5C3D1E] block">Advisory &amp; Usage Note</span>
                <p>{product.complianceNote}</p>
              </div>
            </div>
          </div>

          {/* Related Formulations */}
          {related.length > 0 && (
            <div className="mt-20 pt-12 border-t border-[#E8E0D5]">
              <div className="text-center max-w-xl mx-auto mb-10">
                <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
                  Complete Your Routine
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E2914] mt-1">
                  Complimentary Formulations
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
