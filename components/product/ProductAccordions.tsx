'use client';

import { useState } from 'react';
import { Product } from '@/data/products';

interface ProductAccordionsProps {
  product: Product;
}

export default function ProductAccordions({ product }: ProductAccordionsProps) {
  const [openSection, setOpenSection] = useState<string | null>('benefits');

  const toggle = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections = [
    {
      id: 'benefits',
      title: 'Key Benefits',
      content: (
        <ul className="space-y-2">
          {product.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs sm:text-sm text-[#1A1A1A]">
              <span className="text-[#3A7D44] font-bold">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: 'keyIngredients',
      title: 'Active Key Ingredients',
      content: (
        <div className="flex flex-wrap gap-1.5">
          {product.keyIngredients.map((ing) => (
            <span
              key={ing}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#F3EBDD] text-[#5C3D1E] border border-[#E8E0D5]"
            >
              {ing}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: 'howToUse',
      title: 'How to Use',
      content: (
        <p className="text-xs sm:text-sm text-[#1A1A1A] leading-relaxed">
          {product.howToUse}
        </p>
      ),
    },
    {
      id: 'fullIngredients',
      title: 'Complete Composition (INCI)',
      content: (
        <p className="text-xs text-[#6B6B6B] leading-relaxed font-mono">
          {product.fullIngredients}
        </p>
      ),
    },
    {
      id: 'safety',
      title: 'Storage & Safety Guidelines',
      content: (
        <div className="space-y-2 text-xs sm:text-sm text-[#1A1A1A]">
          {product.storage && (
            <p>
              <strong>Storage:</strong> {product.storage}
            </p>
          )}
          <p className="text-[#E8651A] font-medium">
            <strong>Safety Note:</strong> {product.complianceNote}
          </p>
        </div>
      ),
    },
    {
      id: 'manufacturer',
      title: 'Manufacturer & Regulatory Credentials',
      content: (
        <div className="space-y-2 text-xs text-[#6B6B6B]">
          <p>
            <strong className="text-[#1A1A1A]">Marketed By:</strong> {product.marketedBy}
          </p>
          <p>
            <strong className="text-[#1A1A1A]">Manufactured By:</strong> {product.manufacturerDetails}
          </p>
          {product.mfgLicNo && (
            <p>
              <strong className="text-[#1A1A1A]">Mfg. Lic. No.:</strong> {product.mfgLicNo}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3 pt-6 border-t border-[#E8E0D5]">
      {sections.map((section) => {
        const isOpen = openSection === section.id;
        return (
          <div
            key={section.id}
            className="rounded-2xl border border-[#E8E0D5] bg-white overflow-hidden shadow-2xs"
          >
            <button
              type="button"
              onClick={() => toggle(section.id)}
              aria-expanded={isOpen}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
            >
              <span className="font-serif text-sm sm:text-base font-bold text-[#1A1A1A]">
                {section.title}
              </span>
              <span className="text-lg font-bold text-[#5C3D1E]">
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-[#F3EBDD]">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
