'use client';

import { useCartStore } from '@/lib/cart';
import Link from 'next/link';
import Image from 'next/image';

export default function CartDrawer() {
  const { isOpen, closeCart, items, updateQuantity, removeItem, total } = useCartStore();

  if (!isOpen) return null;

  const cartTotal = total();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FBF6EE] shadow-2xl flex flex-col border-l border-[#E8E0D5]">
          {/* Header */}
          <div className="p-5 border-b border-[#E8E0D5] flex items-center justify-between bg-[#FDFBF7]">
            <h2 className="font-serif text-xl font-bold text-[#5C3D1E]">
              Your Cart ({items.reduce((s, i) => s + i.quantity, 0)})
            </h2>
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close cart drawer"
              className="p-2 rounded-lg text-[#5C3D1E] hover:bg-[#F3EBDD] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <p className="text-[#6B6B6B]">Your cart is currently empty.</p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="px-6 py-2.5 rounded-lg bg-[#5C3D1E] text-white text-sm font-medium hover:bg-[#7A532B] transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map(({ product, quantity }) => (
                <div key={product.slug} className="flex gap-4 p-3 bg-white rounded-xl border border-[#E8E0D5] shadow-xs">
                  <div className="relative w-20 h-20 shrink-0 bg-[#FDFBF7] rounded-lg overflow-hidden border border-[#E8E0D5]">
                    <Image
                      src={product.images[0]?.src || '/images/lip-balm-spa-480.webp'}
                      alt={product.images[0]?.alt || product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-[#1A1A1A] truncate">{product.name}</h3>
                      <p className="text-xs text-[#6B6B6B]">{product.size}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-[#E8E0D5] rounded-lg bg-[#FDFBF7]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.slug, quantity - 1)}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="px-2 py-0.5 text-xs font-bold text-[#5C3D1E] hover:bg-[#F3EBDD]"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-semibold">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.slug, quantity + 1)}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="px-2 py-0.5 text-xs font-bold text-[#5C3D1E] hover:bg-[#F3EBDD]"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-[#5C3D1E]">
                        ₹{(product.price * quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(product.slug)}
                    aria-label={`Remove ${product.name} from cart`}
                    className="text-[#6B6B6B] hover:text-red-600 p-1 self-start"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[#E8E0D5] bg-[#FDFBF7] space-y-3 pb-safe">
              <div className="flex justify-between text-base font-semibold text-[#1A1A1A]">
                <span>Subtotal</span>
                <span className="text-[#5C3D1E]">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-[#6B6B6B]">Taxes & shipping calculated at checkout.</p>
              <div className="flex flex-col gap-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full py-3 rounded-xl bg-[#C9952A] text-white text-sm font-semibold text-center hover:bg-[#B28221] shadow-md transition-colors"
                >
                  Proceed to Checkout
                </Link>
                <a
                  href={`https://wa.me/919469088317?text=${encodeURIComponent(
                    `Hello Dr Ria's! I'd like to place an order for:\n` +
                      items.map((i) => `• ${i.product.name} (${i.product.size}) x${i.quantity} = ₹${i.product.price * i.quantity}`).join('\n') +
                      `\nTotal: ₹${cartTotal}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl border border-[#3A7D44] bg-[#EDF6EE] text-[#3A7D44] text-xs font-semibold text-center hover:bg-[#DDF0DF] transition-colors"
                >
                  Order via WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
