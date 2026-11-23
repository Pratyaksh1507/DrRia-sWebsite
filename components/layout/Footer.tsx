'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-[#3E2914] text-[#FBF6EE] pt-16 pb-12 border-t border-[#5C3D1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#5C3D1E]/60">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="pb-1">
              <Link
                href="/"
                aria-label="Dr Ria's home"
                className="inline-block focus:outline-none focus:ring-2 focus:ring-[#C9952A] transition-opacity hover:opacity-90"
              >
                <picture>
                  <source srcSet="/brand/footer-logo-transparent.webp" type="image/webp" />
                  <img
                    src="/brand/footer-logo-transparent.png"
                    alt="Dr Ria's logo"
                    width={400}
                    height={436}
                    loading="lazy"
                    decoding="async"
                    className="w-[130px] md:w-[150px] h-auto object-contain"
                  />
                </picture>
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-[#E8E0D5]/80 leading-relaxed">
              Skincare and haircare formulated with pure botanical extracts and targeted ingredients, crafted with care in India.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-block px-2.5 py-1 rounded bg-[#5C3D1E] text-[#FBF6EE] font-medium border border-[#7A532B]">
                Made in India
              </span>
              <span className="inline-block px-2.5 py-1 rounded bg-[#5C3D1E] text-[#FBF6EE] font-medium border border-[#7A532B]">
                Transparent Ingredients
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#C9952A] mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm text-[#E8E0D5]/80">
              <li>
                <Link href="/" className="hover:text-[#C9952A] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/shop" className="hover:text-[#C9952A] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/shop?category=skin" className="hover:text-[#C9952A] transition-colors">
                  Facial Skincare
                </Link>
              </li>
              <li>
                <Link href="/shop?category=hair" className="hover:text-[#C9952A] transition-colors">
                  Hair Strengthening
                </Link>
              </li>
              <li>
                <Link href="/shop?category=sun" className="hover:text-[#C9952A] transition-colors">
                  Sun Protection
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#C9952A] transition-colors">
                  About Dr Ria&apos;s
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#C9952A] mb-4">
              Legal &amp; Support
            </h3>
            <ul className="space-y-2.5 text-sm text-[#E8E0D5]/80">
              <li>
                <Link href="/policies/shipping" className="hover:text-[#C9952A] transition-colors">
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link href="/policies/returns" className="hover:text-[#C9952A] transition-colors">
                  Returns &amp; Refunds
                </Link>
              </li>
              <li>
                <Link href="/policies/privacy" className="hover:text-[#C9952A] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/policies/terms" className="hover:text-[#C9952A] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#C9952A] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#C9952A] mb-4">
              Get in Touch
            </h3>
            <p className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE]">Address:</strong>
              93-C Shastri Nagar, Jammu, 180004
            </p>
            <div className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE] mb-1">Customer Care / WhatsApp:</strong>
              <a
                href="https://wa.me/919469088317"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Dr Ria's at +91-9469088317"
                className="inline-flex items-center gap-2 text-sm text-[#E8E0D5]/90 hover:text-[#C9952A] transition-colors group"
              >
                <svg
                  className="w-4 h-4 text-[#25D366] shrink-0 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.832.898 2.791.898h.001c3.182 0 5.77-2.587 5.77-5.767 0-3.18-2.587-5.766-5.77-5.766zm9.969 5.767c0 5.518-4.482 10-10 10-1.748 0-3.385-.45-4.814-1.239l-5.186 1.358 1.385-5.059c-.87-1.488-1.385-3.218-1.385-5.06 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10z"/>
                </svg>
                <span className="underline underline-offset-2 group-hover:text-[#C9952A]">+91-9469088317</span>
              </a>
            </div>
            <div className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE] mb-1">Email:</strong>
              <a
                href="mailto:drrias.official@gmail.com"
                aria-label="Email Dr Ria's at drrias.official@gmail.com"
                className="inline-flex items-center gap-2 text-sm text-[#E8E0D5]/90 hover:text-[#C9952A] transition-colors group break-all"
              >
                <svg
                  className="w-4 h-4 text-[#C9952A] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="underline underline-offset-2 group-hover:text-[#C9952A]">drrias.official@gmail.com</span>
              </a>
            </div>
            <div className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE] mb-1">Instagram:</strong>
              <a
                href="https://www.instagram.com/drrias.official?psln=aHBzenR1enhmeXZ1&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Dr Ria's on Instagram @drrias.official"
                className="inline-flex items-center gap-2 text-sm text-[#E8E0D5]/90 hover:text-[#C9952A] transition-colors group"
              >
                <svg
                  className="w-4 h-4 text-[#E1306C] shrink-0 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="underline underline-offset-2 group-hover:text-[#C9952A]">@drrias.official</span>
              </a>
            </div>
            <div className="pt-2 flex flex-wrap gap-2.5">
              <a
                href="https://wa.me/919469088317"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#3A7D44] text-white text-xs font-semibold hover:bg-[#306637] transition-colors shadow-xs"
                aria-label="Chat on WhatsApp"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.832.898 2.791.898h.001c3.182 0 5.77-2.587 5.77-5.767 0-3.18-2.587-5.766-5.77-5.766zm9.969 5.767c0 5.518-4.482 10-10 10-1.748 0-3.385-.45-4.814-1.239l-5.186 1.358 1.385-5.059c-.87-1.488-1.385-3.218-1.385-5.06 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
              <a
                href="https://www.instagram.com/drrias.official?psln=aHBzenR1enhmeXZ1&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors border border-[#7A532B] shadow-xs"
                aria-label="Follow on Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current text-[#FBF6EE]" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Mandatory Credits and Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[#E8E0D5]/70 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span>&copy; 2026 Dr Ria&apos;s. All rights reserved.</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="text-[#C9952A] font-medium">Product design &amp; marketed by Sachin Kashyap</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="text-[#C9952A] font-medium">
              Website designed &amp; developed by{' '}
              <a
                href="mailto:pratyakshkalsi9@gmail.com?subject=Website%20enquiry%20-%20Dr%20Ria's"
                aria-label="Email Pratyaksh Kalsi"
                className="text-[#C9952A] hover:underline focus:outline-none focus:ring-1 focus:ring-[#C9952A] rounded-xs"
              >
                Pratyaksh Kalsi
              </a>
            </span>
          </div>
          <div className="text-center md:text-right text-[11px] text-[#E8E0D5]/60">
            <span>Skincare &amp; Haircare &bull; Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
