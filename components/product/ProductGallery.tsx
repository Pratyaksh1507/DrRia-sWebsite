'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/data/products';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeImage = images[selectedIndex] || images[0];

  return (
    <div className="space-y-4">
      {/* Main Large Display Image */}
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white border border-[#E8E0D5] shadow-xs">
        <Image
          src={activeImage.src}
          alt={activeImage.alt}
          fill
          priority={false}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder={activeImage.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={activeImage.blurDataURL}
          className="object-cover object-center transition-all duration-300"
        />
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
          {selectedIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails Row */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
        role="region"
        aria-label="Product thumbnails"
      >
        {images.map((img, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
              key={img.src}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              aria-label={`Show image ${idx + 1} of ${images.length} for ${productName}`}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all bg-white ${
                isSelected
                  ? 'border-[#5C3D1E] ring-2 ring-[#C9952A]/40'
                  : 'border-[#E8E0D5] hover:border-[#5C3D1E]/40 opacity-80 hover:opacity-100'
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="96px"
                loading="lazy"
                placeholder={img.blurDataURL ? 'blur' : 'empty'}
                blurDataURL={img.blurDataURL}
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
