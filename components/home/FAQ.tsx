'use client';

import { useState } from 'react';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Are Dr Ria's products safe for sensitive skin?",
      a: 'Our formulations combine gentle botanical butters and purposeful actives. However, because natural extracts can cause individual sensitivities, we always recommend doing a 24-hour patch test on the inner forearm before first use.',
    },
    {
      q: 'How should I store these products?',
      a: 'Store all bottles and jars in a cool, dry place away from direct sunlight and heat. Keep containers tightly closed when not in use.',
    },
    {
      q: "Where are Dr Ria's products manufactured?",
      a: 'Our products are manufactured in licensed cosmetic facilities in India, including Ambient Bio Care in Delhi, Vancom Solutions in Gurgaon, and Trassally International in Noida, with complete manufacturing licenses displayed on each product label.',
    },
    {
      q: 'How long does dispatch take?',
      a: 'Orders are processed and dispatched within 24 to 48 business hours. You will receive tracking details via SMS/WhatsApp once your parcel is on its way.',
    },
    {
      q: 'What is your return policy?',
      a: 'Due to personal hygiene and safety standards for cosmetic products, opened or used items cannot be returned. If you receive a damaged or incorrect package, please contact us within 48 hours with unboxing photos for a prompt replacement.',
    },
  ];

  return (
    <section className="py-16 bg-[#FBF6EE]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-widest uppercase text-[#7A532B]">
            Questions &amp; Answers
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#3E2914] mt-1">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.q}
                className="bg-white rounded-xl border border-[#E8E0D5] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                >
                  <span className="font-serif text-base font-semibold text-[#1A1A1A]">
                    {faq.q}
                  </span>
                  <span className="text-xl text-[#5C3D1E] font-bold">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#6B6B6B] leading-relaxed border-t border-[#F3EBDD]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
