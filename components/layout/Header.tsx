'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/lib/cart';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();

  const openCart = useCartStore((state) => state.openCart);
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop All' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FBF6EE]/95 backdrop-blur-md border-b border-[#E8E0D5] transition-all">
      {/* Top Notification Bar */}
      <div className="bg-[#5C3D1E] text-[#FBF6EE] px-4 py-1.5 text-xs text-center font-medium tracking-wide">
        <span>Pure Ingredients &bull; Transparent Formulas &bull; Customer Care: +91-9469088317</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobile menu trigger */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#5C3D1E] hover:bg-[#F3EBDD] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Brand Wordmark / Logo */}
          <div className="flex-1 md:flex-initial text-center md:text-left">
            <Link href="/" className="inline-block group focus:outline-none">
              <span className="block font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#5C3D1E] group-hover:text-[#C9952A] transition-colors">
                Dr Ria&apos;s
              </span>
              <span className="block text-[10px] sm:text-xs font-sans tracking-[0.2em] uppercase text-[#7A532B] font-medium">
                Pure &bull; Honest &bull; Transparent
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium tracking-wide transition-colors py-1 border-b-2 ${
                    isActive
                      ? 'border-[#5C3D1E] text-[#5C3D1E]'
                      : 'border-transparent text-[#1A1A1A] hover:text-[#5C3D1E] hover:border-[#C9952A]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* WhatsApp Support Button */}
            <a
              href="https://wa.me/919469088317"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Dr Ria's team on WhatsApp"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#EDF6EE] text-[#3A7D44] hover:bg-[#DDF0DF] transition-colors border border-[#C5E5C9]"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.832.898 2.791.898h.001c3.182 0 5.77-2.587 5.77-5.767 0-3.18-2.587-5.766-5.77-5.766zm9.969 5.767c0 5.518-4.482 10-10 10-1.748 0-3.385-.45-4.814-1.239l-5.186 1.358 1.385-5.059c-.87-1.488-1.385-3.218-1.385-5.06 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10z"/>
              </svg>
              <span>WhatsApp</span>
            </a>

            {/* Tap to Call Link */}
            <a
              href="tel:+919469088317"
              aria-label="Call Customer Care +91-9469088317"
              className="p-2 text-[#5C3D1E] hover:text-[#C9952A] rounded-full hover:bg-[#F3EBDD] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </a>

            {/* Shopping Cart Trigger Button */}
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open shopping cart with ${hydrated ? itemCount : 0} items`}
              className="relative p-2.5 rounded-full text-[#5C3D1E] hover:text-[#C9952A] hover:bg-[#F3EBDD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {/* Hide cart badge when count is 0 */}
              {hydrated && itemCount > 0 && (
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold bg-[#C9952A] text-white shadow-sm"
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E0D5] bg-[#FDFBF7] px-4 pt-3 pb-6 space-y-3 animate-fade-in shadow-lg">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-base font-medium text-[#1A1A1A] hover:bg-[#F3EBDD] hover:text-[#5C3D1E] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-[#E8E0D5] flex flex-col gap-2.5">
            <a
              href="https://wa.me/919469088317"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#3A7D44] text-white text-sm font-medium hover:bg-[#306637] transition-colors"
            >
              <span>Chat on WhatsApp (+91-9469088317)</span>
            </a>
            <a
              href="tel:+919469088317"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-[#5C3D1E] text-[#5C3D1E] text-sm font-medium hover:bg-[#F3EBDD] transition-colors"
            >
              <span>Call: +91-9469088317</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
