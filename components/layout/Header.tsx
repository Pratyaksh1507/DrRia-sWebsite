'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCartStore } from '@/lib/cart';
import Logo from '@/components/Logo';

// Dynamic import of UserNav ensures no heavy auth SDK bundle on home/shop/product pages
const UserNav = dynamic(() => import('@/components/layout/UserNav'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="min-w-[44px] min-h-[44px] p-2.5 rounded-full text-[#5C3D1E] flex items-center justify-center"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  ),
});

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [shouldLoadAuth, setShouldLoadAuth] = useState(false);
  const pathname = usePathname();

  const openCart = useCartStore((state) => state.openCart);
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    useCartStore.getState().initializeCart();
    setHydrated(true);

    const isAuthRoute =
      pathname.startsWith('/account') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/login');
    const hasAuthCookie =
      typeof document !== 'undefined' &&
      document.cookie.split(';').some((c) => c.trim().startsWith('sb-'));

    if (isAuthRoute || hasAuthCookie) {
      setShouldLoadAuth(true);
    }
  }, [pathname]);

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
        <div className="flex items-center justify-between h-20 gap-2">
          {/* Brand Logo (Left) */}
          <div className="flex items-center shrink-0">
            <Logo />
          </div>

          {/* Desktop Navigation (Centered) */}
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
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* WhatsApp Support Button (Desktop / Tablet) */}
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

            {/* User Account / Sign In Nav */}
            {shouldLoadAuth ? (
              <UserNav />
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="relative p-2.5 rounded-full text-[#5C3D1E] hover:text-[#C9952A] hover:bg-[#F3EBDD]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] min-w-[44px] min-h-[44px] flex items-center justify-center group"
                aria-label="Sign in"
                onMouseEnter={() => setShouldLoadAuth(true)}
                onFocus={() => setShouldLoadAuth(true)}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="sr-only">Sign in</span>
                {/* Tooltip on desktop */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#3E2914] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus:opacity-100 z-50"
                >
                  Sign in
                </span>
              </Link>
            )}

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

            {/* Mobile Menu Trigger Button (Right on mobile) */}
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
            <Link
              href="/account"
              className="px-3 py-2 rounded-lg text-base font-semibold text-[#5C3D1E] hover:bg-[#F3EBDD] transition-colors flex items-center justify-between"
            >
              <span>My Account &amp; Orders</span>
              <span>&rarr;</span>
            </Link>
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
          </div>
        </div>
      )}
    </header>
  );
}
