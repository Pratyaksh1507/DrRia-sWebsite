'use client';

import React from 'react';
import Link from 'next/link';

const desktopProducts = [
  {
    slug: 'anti-pigmentation-lip-balm',
    name: 'Anti Pigmentation Lip Balm',
    x: 5.7,
    y: 66.7,
    w: 17.9,
    h: 26.7,
  },
  {
    slug: 'spf-50-pa-sunscreen',
    name: 'SPF-50 PA+++ Sunscreen',
    x: 25.4,
    y: 15.6,
    w: 11.0,
    h: 71.1,
  },
  {
    slug: 'hair-growth-oil',
    name: 'Hair Growth Oil',
    x: 42.5,
    y: 3.7,
    w: 15.1,
    h: 83.0,
  },
  {
    slug: 'vita-c-daily-glow-face-wash',
    name: 'Vita C Daily Glow Face Wash',
    x: 62.2,
    y: 9.6,
    w: 13.9,
    h: 77.0,
  },
  {
    slug: 'hydroboost-face-moisturizer',
    name: 'Hydroboost Face Moisturizer',
    x: 75.2,
    y: 56.3,
    w: 20.5,
    h: 37.0,
  },
];

const mobileProducts = [
  {
    slug: 'anti-pigmentation-lip-balm',
    name: 'Anti Pigmentation Lip Balm',
    x: 3.2,
    y: 71.1,
    w: 30.9,
    h: 20.7,
  },
  {
    slug: 'spf-50-pa-sunscreen',
    name: 'SPF-50 PA+++ Sunscreen',
    x: 15.4,
    y: 25.9,
    w: 19.4,
    h: 56.3,
  },
  {
    slug: 'hair-growth-oil',
    name: 'Hair Growth Oil',
    x: 36.6,
    y: 15.6,
    w: 26.9,
    h: 66.7,
  },
  {
    slug: 'vita-c-daily-glow-face-wash',
    name: 'Vita C Daily Glow Face Wash',
    x: 61.6,
    y: 20.0,
    w: 25.0,
    h: 62.2,
  },
  {
    slug: 'hydroboost-face-moisturizer',
    name: 'Hydroboost Face Moisturizer',
    x: 60.4,
    y: 62.2,
    w: 36.4,
    h: 29.6,
  },
];

const altText =
  "Dr Ria's range: anti pigmentation lip balm, SPF-50 sunscreen, hair growth oil, Vita C face wash and Hydroboost moisturizer";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F3EBDD]/60 py-10 sm:py-14 lg:py-18 border-b border-[#E8E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Text Content */}
          <div className="lg:col-span-5 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3F8] text-[#244E6E] text-xs font-semibold tracking-wide border border-[#C5DCEB]">
              <span className="w-2 h-2 rounded-full bg-[#244E6E] animate-pulse" />
              <span>Made in India</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#3E2914] leading-[1.18]">
              Skincare &amp; haircare, made with care in India
            </h1>

            <p className="max-w-xl mx-auto lg:mx-0 text-sm sm:text-base text-[#5C3D1E]/90 leading-relaxed font-normal">
              Thoughtfully formulated with purposeful botanicals and transparent ingredient profiles on every label.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <Link
                href="/shop"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#C9952A] shadow-md hover:shadow-lg transition-all text-center focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
              >
                Shop All Formulations
              </Link>
              <Link
                href="/about"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-[#5C3D1E] text-[#5C3D1E] text-sm font-semibold hover:bg-[#F3EBDD] transition-colors text-center"
              >
                Our Philosophy
              </Link>
            </div>

            {/* Truthful Credentials Strip */}
            <div className="pt-5 border-t border-[#E8E0D5]/80 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#7A532B] font-medium">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Made in India</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Ingredient lists on every product</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Patch-test guidance</span>
              </div>
            </div>
          </div>

          {/* Product Lineup Image Column */}
          <div className="lg:col-span-7">
            {/* Desktop Lineup Showcase (16:9 Aspect Ratio) */}
            <div className="hidden lg:block relative w-full aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 bg-[#FBF6EE]">
              <picture className="w-full h-full block">
                <source type="image/avif" srcSet="/images/dr-rias-hero-lineup-desktop.avif" />
                <source type="image/webp" srcSet="/images/dr-rias-hero-lineup-desktop.webp" />
                <img
                  src="/images/dr-rias-hero-lineup-desktop.webp"
                  alt={altText}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  width={2400}
                  height={1350}
                  className="w-full h-full object-cover object-center"
                />
              </picture>

              {/* Interactive Desktop Hotspots */}
              {desktopProducts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  aria-label={`View ${p.name}`}
                  className="absolute group rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] focus:ring-offset-2 hover:bg-[#5C3D1E]/5 cursor-pointer z-10"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.w}%`,
                    height: `${p.h}%`,
                  }}
                >
                  <span className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200 transform -translate-y-1 group-hover:translate-y-0 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#3E2914] text-[#FBF6EE] text-[11px] font-semibold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-20 flex items-center gap-1 border border-[#C9952A]/40">
                    <span>{p.name}</span>
                    <span className="text-[#C9952A]">&rarr;</span>
                  </span>
                </Link>
              ))}

              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md py-2 px-3.5 rounded-xl shadow-md border border-[#E8E0D5] pointer-events-none z-10">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#7A532B]">
                  Authentic Formulations
                </span>
                <span className="block text-xs font-semibold text-[#1A1A1A]">
                  Click any product to explore
                </span>
              </div>
            </div>

            {/* Mobile Lineup Showcase (4:5 Aspect Ratio) */}
            <div className="block lg:hidden relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border-4 border-white/80 bg-[#FBF6EE]">
              <picture className="w-full h-full block">
                <source type="image/avif" srcSet="/images/dr-rias-hero-lineup-mobile.avif" />
                <source type="image/webp" srcSet="/images/dr-rias-hero-lineup-mobile.webp" />
                <img
                  src="/images/dr-rias-hero-lineup-mobile.webp"
                  alt={altText}
                  fetchPriority="high"
                  loading="eager"
                  decoding="async"
                  width={1080}
                  height={1350}
                  className="w-full h-full object-cover object-center"
                />
              </picture>

              {/* Interactive Mobile Hotspots */}
              {mobileProducts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  aria-label={`View ${p.name}`}
                  className="absolute group rounded-2xl transition-all active:bg-[#5C3D1E]/10 focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] cursor-pointer z-10"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: `${p.w}%`,
                    height: `${p.h}%`,
                  }}
                >
                  <span className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-[#3E2914] text-[#FBF6EE] text-[11px] font-semibold py-1 px-2.5 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-20 border border-[#C9952A]/40">
                    {p.name} &rarr;
                  </span>
                </Link>
              ))}

              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md py-1.5 px-3 rounded-lg shadow-sm border border-[#E8E0D5] pointer-events-none z-10">
                <span className="block text-[10px] font-semibold text-[#5C3D1E]">
                  Tap product to view formulation &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
