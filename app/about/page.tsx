import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Dr Ria’s | Clinical Luxury Formulation',
  description:
    'Learn about the formulation philosophy, clinical standards, and leadership behind Dr Ria’s skincare and haircare.',
};

export default function AboutPage() {
  return (
    <div className="py-16 sm:py-24 bg-[#FBF6EE]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Intro */}
        <div className="text-center space-y-4">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Our Story &amp; Standards
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#3E2914]">
            Dermatologist-Designed. Botanical Integrity.
          </h1>
          <p className="text-sm sm:text-base text-[#6B6B6B] max-w-2xl mx-auto leading-relaxed">
            Formulating clean, clinically verifiable cosmetics specifically designed to protect, restore, and celebrate Indian skin and hair.
          </p>
        </div>

        {/* Narrative */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-6 text-sm text-[#1A1A1A] leading-relaxed">
          <h2 className="font-serif text-2xl font-bold text-[#5C3D1E]">
            The Genesis of Dr Ria&apos;s
          </h2>
          <p>
            [EDIT: Dr Ria founded this brand to bridge the divide between harsh clinical prescriptions and gentle Ayurvedic botanicals.] 
            Recognizing that Indian skin faces distinct climatic challenges—prolonged UV exposure, urban pollution, and varying humidity across seasons—Dr Ria’s sets out to engineer everyday essentials that strengthen rather than strip the moisture barrier.
          </p>
          <p>
            From our multi-active <strong>Hair Growth Oil</strong> containing 14 pure botanical extracts to our high-defence <strong>SPF-50 PA+++ Sunscreen</strong> and moisture-binding <strong>Hydroboost Moisturizer</strong>, every bottle reflects rigorous ingredient purity and transparent labeling.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#F3EBDD]">
            <div className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5]">
              <span className="block font-serif text-xl font-bold text-[#5C3D1E]">100%</span>
              <span className="text-xs text-[#6B6B6B]">Paraben-Free &amp; Toxin-Free</span>
            </div>
            <div className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5]">
              <span className="block font-serif text-xl font-bold text-[#5C3D1E]">GMP</span>
              <span className="text-xs text-[#6B6B6B]">Certified Medical-Grade Labs</span>
            </div>
            <div className="p-4 rounded-xl bg-[#FDFBF7] border border-[#E8E0D5]">
              <span className="block font-serif text-xl font-bold text-[#5C3D1E]">ISO 9001</span>
              <span className="text-xs text-[#6B6B6B]">Quality Management Audited</span>
            </div>
          </div>
        </div>

        {/* Dedicated Behind Dr Ria's Section (Mandatory Credits) */}
        <div className="bg-[#FAF5EA] p-8 sm:p-12 rounded-3xl border border-[#E8E0D5] space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
              Leadership &amp; Craft
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E2914] mt-1">
              Behind Dr Ria&apos;s
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#6B6B6B]">
              The passionate minds driving the product experience, visual identity, and technical foundation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EBF3F8] text-[#4A7FA5] text-[11px] font-semibold uppercase">
                Product &amp; Brand
              </span>
              <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">
                Sachin Kashyap
              </h3>
              <p className="text-xs font-semibold text-[#C9952A]">
                Product design &amp; marketed by Sachin Kashyap
              </p>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Spearheading product formulation aesthetics, packaging design, ingredient curation, and market distribution across India to ensure clinical luxury is accessible.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-3">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EDF6EE] text-[#3A7D44] text-[11px] font-semibold uppercase">
                Engineering &amp; Design
              </span>
              <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">
                Pratyaksh Kalsi
              </h3>
              <p className="text-xs font-semibold text-[#C9952A]">
                Website designed &amp; developed by Pratyaksh Kalsi
              </p>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                Architecting the modern digital storefront, performance engineering, mobile UX, accessibility compliance, and secure checkout systems for Dr Ria&apos;s patrons.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <Link
            href="/shop"
            className="inline-block px-8 py-3.5 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#C9952A] transition-colors shadow-sm"
          >
            Explore the Formulations
          </Link>
        </div>
      </div>
    </div>
  );
}
