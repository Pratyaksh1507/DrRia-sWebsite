'use client';

import { useState } from 'react';
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
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-[#FBF6EE] border border-[#E8E0D5] shadow-xs">
        <picture className="block w-full h-full">
          {activeImage.avifSrcSet && (
            <source
              type="image/avif"
              srcSet={activeImage.avifSrcSet}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
          {activeImage.webpSrcSet && (
            <source
              type="image/webp"
              srcSet={activeImage.webpSrcSet}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
          <img
            key={activeImage.src}
            src={activeImage.src}
            alt={activeImage.alt}
            width={activeImage.width || 768}
            height={activeImage.height || 768}
            loading={selectedIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={selectedIndex === 0 ? 'high' : 'auto'}
            decoding="async"
            style={
              activeImage.blurDataURL
                ? {
                    backgroundImage: `url("${activeImage.blurDataURL}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
            className="w-full h-full object-cover object-center transition-all duration-300"
          />
        </picture>
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
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
              <picture className="block w-full h-full">
                {img.avifSrcSet && (
                  <source
                    type="image/avif"
                    srcSet={img.avifSrcSet}
                    sizes="96px"
                  />
                )}
                {img.webpSrcSet && (
                  <source
                    type="image/webp"
                    srcSet={img.webpSrcSet}
                    sizes="96px"
                  />
                )}
                <img
                  src={img.src}
                  alt={img.alt}
                  width={96}
                  height={96}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </picture>
            </button>
          );
        })}
      </div>
    </div>
  );
}
