'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/data/products';
import { useCartStore } from '@/lib/cart';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const heroImg = product.images[product.heroImageIndex] || product.images[0];

  return (
    <article className="group relative flex flex-col bg-white rounded-2xl border border-[#E8E0D5] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300">
      {/* Image Container with explicit aspect ratio */}
      <Link
        href={`/products/${product.slug}`}
        className="relative block w-full aspect-square bg-[#FDFBF7] overflow-hidden"
        aria-label={`View details for ${product.name}`}
      >
        <Image
          src={heroImg.src}
          alt={heroImg.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          placeholder={heroImg.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={heroImg.blurDataURL}
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {/* Category Accent Badge */}
        <div className="absolute top-3 left-3">
          <span
            className="inline-block px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-full shadow-xs text-white"
            style={{ backgroundColor: product.accentColor }}
          >
            {product.categoryLabel}
          </span>
        </div>
      </Link>

      {/* Product Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B6B6B]">{product.size}</span>
            {product.badges && product.badges[0] && (
              <span className="text-[10px] text-[#3A7D44] bg-[#EDF6EE] px-2 py-0.5 rounded font-medium">
                {product.badges[0]}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-serif text-lg font-bold text-[#1A1A1A] group-hover:text-[#5C3D1E] transition-colors leading-snug">
            <Link href={`/products/${product.slug}`}>
              <span aria-hidden="true" className="absolute inset-x-0 top-0 bottom-16" />
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-[#6B6B6B] line-clamp-1">{product.tagline}</p>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[#F3EBDD]">
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-[#6B6B6B]">Price</span>
            <span className="font-semibold text-base sm:text-lg text-[#5C3D1E]">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product, 1);
            }}
            className="relative z-10 inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-[#5C3D1E] text-white hover:bg-[#C9952A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] transition-colors shadow-xs"
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
}
