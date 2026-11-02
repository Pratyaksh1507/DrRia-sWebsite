'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product } from '@/data/products';
import ProductCard from '@/components/ui/ProductCard';

interface ShopClientProps {
  products: Product[];
}

export default function ShopClient({ products }: ShopClientProps) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'skin', label: 'Facial Care' },
    { id: 'hair', label: 'Hair Care' },
    { id: 'lips', label: 'Lip Care' },
    { id: 'sun', label: 'Sun Protection' },
  ];

  const filteredAndSorted = useMemo(() => {
    let result = products;
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory);
    }

    if (sortBy === 'price-asc') {
      return [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      return [...result].sort((a, b) => b.price - a.price);
    }
    return result;
  }, [products, activeCategory, sortBy]);

  return (
    <div>
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 mb-8 border-b border-[#E8E0D5]">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Product Categories">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#5C3D1E] text-white shadow-xs'
                    : 'bg-white text-[#5C3D1E] border border-[#E8E0D5] hover:bg-[#F3EBDD]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <label htmlFor="sort-select" className="text-xs font-medium text-[#6B6B6B]">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E0D5] text-xs font-medium text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E8E0D5]">
          <p className="text-[#6B6B6B] text-sm">No formulations found in this category.</p>
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className="mt-4 px-4 py-2 rounded-lg bg-[#5C3D1E] text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredAndSorted.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              eager={index < 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}
