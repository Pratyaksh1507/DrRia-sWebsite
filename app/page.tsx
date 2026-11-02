import HeroSection from '@/components/home/HeroSection';
import TrustStrip from '@/components/home/TrustStrip';
import CategoryTiles from '@/components/home/CategoryTiles';
import WhyDrRias from '@/components/home/WhyDrRias';
import FAQ from '@/components/home/FAQ';
import Newsletter from '@/components/home/Newsletter';
import ProductCard from '@/components/ui/ProductCard';
import { getAllProducts } from '@/data/products';
import Link from 'next/link';

export default function Home() {
  const allProducts = getAllProducts();

  return (
    <>
      <HeroSection />
      <TrustStrip />

      {/* Bestseller Grid */}
      <section className="py-16 sm:py-20 bg-[#FBF6EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
                The Full Collection
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#3E2914] mt-1">
                Clinical Formulations
              </h2>
              <p className="mt-1 text-sm text-[#6B6B6B]">
                Engineered with active percentages, certified manufacturing, and transparent ingredient profiles.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center text-sm font-semibold text-[#5C3D1E] hover:text-[#C9952A] transition-colors group"
            >
              <span>Explore All Products</span>
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <CategoryTiles />
      <WhyDrRias />
      <FAQ />
      <Newsletter />
    </>
  );
}
