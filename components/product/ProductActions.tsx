'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/data/products';
import { useCartStore } from '@/lib/cart';

interface ProductActionsProps {
  product: Product;
}

export default function ProductActions({ product }: ProductActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const isAvailable =
    product.inStock &&
    (product.stockQuantity === undefined || product.stockQuantity > 0) &&
    product.isActive !== false;

  const handleAddToCart = () => {
    if (!isAvailable) return;
    addItem(product, quantity);
  };

  const handleBuyNow = () => {
    if (!isAvailable) return;
    addItem(product, quantity);
    router.push('/checkout');
  };

  const sizeLabel = product.size ? ` (${product.size})` : '';
  const whatsAppText = encodeURIComponent(
    `Hello Dr Ria's! I would like to order: ${product.name}${sizeLabel} x ${quantity} = ₹${(
      product.price * quantity
    ).toLocaleString('en-IN')}.\nPlease confirm availability.`
  );

  return (
    <>
      <div className="space-y-4 pt-2">
        {/* Quantity selector */}
        {isAvailable && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
              Quantity
            </span>
            <div className="flex items-center border border-[#E8E0D5] rounded-xl bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="px-3 py-2 text-sm font-bold text-[#5C3D1E] hover:bg-[#F3EBDD] rounded-l-xl disabled:opacity-40"
              >
                −
              </button>
              <span className="px-4 text-sm font-bold text-[#1A1A1A]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                disabled={quantity >= 10 || (product.stockQuantity !== undefined && quantity >= product.stockQuantity)}
                aria-label="Increase quantity"
                className="px-3 py-2 text-sm font-bold text-[#5C3D1E] hover:bg-[#F3EBDD] rounded-r-xl disabled:opacity-40"
              >
                +
              </button>
            </div>
            {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <span className="text-xs font-semibold text-amber-700">
                Only {product.stockQuantity} remaining
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {isAvailable ? (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#7A532B] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
              >
                Add to Cart &bull; ₹{(product.price * quantity).toLocaleString('en-IN')}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#C9952A] text-white text-sm font-semibold hover:bg-[#B28221] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
              >
                Buy Now
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-6 rounded-xl bg-[#E8E0D5] text-[#6B6B6B] text-sm font-semibold cursor-not-allowed shadow-none"
            >
              Currently Out of Stock
            </button>
          )}
        </div>

        {/* WhatsApp Order Fallback */}
        <div>
          <a
            href={`https://wa.me/919469088317?text=${whatsAppText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#3A7D44] bg-[#EDF6EE] text-[#3A7D44] text-xs font-semibold hover:bg-[#DDF0DF] transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.832.898 2.791.898h.001c3.182 0 5.77-2.587 5.77-5.767 0-3.18-2.587-5.766-5.77-5.766zm9.969 5.767c0 5.518-4.482 10-10 10-1.748 0-3.385-.45-4.814-1.239l-5.186 1.358 1.385-5.059c-.87-1.488-1.385-3.218-1.385-5.06 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10z"/>
            </svg>
            <span>Order on WhatsApp (+91-9469088317)</span>
          </a>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar (per storefront-best-practices with safe-area padding) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E0D5] p-3 shadow-2xl pb-safe">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] text-[#6B6B6B] uppercase font-medium">Price</span>
            <span className="font-bold text-base text-[#5C3D1E]">
              ₹{(product.price * quantity).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            <button
              type="button"
              onClick={handleAddToCart}
              className="py-2.5 px-4 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold shadow-xs"
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="py-2.5 px-4 rounded-xl bg-[#C9952A] text-white text-xs font-semibold shadow-xs"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
