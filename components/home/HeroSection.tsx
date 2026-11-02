import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F3EBDD]/60 py-16 sm:py-24 lg:py-28 border-b border-[#E8E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3F8] text-[#244E6E] text-xs font-semibold tracking-wide border border-[#C5DCEB]">
              <span className="w-2 h-2 rounded-full bg-[#244E6E] animate-pulse" />
              <span>Made in India</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#3E2914] leading-[1.15]">
              Skincare &amp; haircare, made with care in India
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg text-[#5C3D1E]/90 leading-relaxed font-normal">
              Thoughtfully formulated with natural actives and verified ingredients for daily care.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/shop"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#C9952A] shadow-md hover:shadow-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
              >
                Shop All Formulations
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-[#5C3D1E] text-[#5C3D1E] text-sm font-semibold hover:bg-[#F3EBDD] transition-colors text-center"
              >
                Our Philosophy
              </Link>
            </div>

            {/* Quick credentials */}
            <div className="pt-6 border-t border-[#E8E0D5]/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#7A532B] font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Made in India</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Ingredient lists on every product</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Patch-test guidance</span>
              </div>
            </div>
          </div>

          {/* Hero Image — Sole priority loaded image per performance targets */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 bg-white">
              <Image
                src="/images/dr-rias-collection-hero-768.webp"
                alt="Dr Ria's Skin & Hair Care Collection — Complete product line on marble pedestal"
                fill
                priority={true}
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, 50vw"
                placeholder="blur"
                blurDataURL="data:image/webp;base64,UklGRtwAAABXRUJQVlA4INAAAABwBACdASoUABQAPtFgqU+oJSOiKAgBABoJZgCsMy/luAHKI43+PioTSJWGAAD+uB/X/IHX53s43WoRScX2S7mV+oBJjpHkZB+2B3xsKMsXwx5+muFN4N/hgQ1ERHTim9T7ou6lC/oHLEolOF+ll8gLYhNEicJbF6+coAEQPGxbcVd2ZB9HNlTToXPWVyWMK1qH3h8ZcuabN0MtVBzsP5wBaQoO9ADJlGpJ93CZo1flOoe7usr827+URk1XPANs9X5fH8IFqv942AlxWhWRGAAA"
                className="object-cover object-center"
              />
            </div>
            {/* Soft decorative badge */}
            <div className="absolute -bottom-4 -left-4 sm:bottom-4 sm:-left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-[#E8E0D5] max-w-[200px]">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7A532B]">
                The Full Collection
              </span>
              <span className="block text-xs font-medium text-[#1A1A1A] mt-0.5">
                Skin &amp; Hair Care formulated for daily care.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
