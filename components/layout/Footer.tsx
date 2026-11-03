import Link from 'next/link';

export default function Footer() {
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
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#C9952A] mb-4">
              Get in Touch
            </h3>
            <p className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE]">Address:</strong>
              93-C Shastri Nagar, Jammu, 180004
            </p>
            <p className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE]">Customer Care:</strong>
              <a href="tel:+919469088317" className="hover:text-[#C9952A] underline underline-offset-2">
                +91-9469088317
              </a>
            </p>
            <p className="text-sm text-[#E8E0D5]/80">
              <strong className="block text-[#FBF6EE]">Email:</strong>
              <a href="mailto:simplyria11@gmail.com" className="hover:text-[#C9952A] underline underline-offset-2">
                simplyria11@gmail.com
              </a>
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/919469088317"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3A7D44] text-white text-xs font-semibold hover:bg-[#306637] transition-colors"
              >
                <span>Chat on WhatsApp</span>
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
