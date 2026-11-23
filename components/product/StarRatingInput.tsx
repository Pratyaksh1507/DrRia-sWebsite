'use client';

import React, { useState } from 'react';

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  error?: string;
}

export default function StarRatingInput({ value, onChange, error }: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayRating = hoverValue !== null ? hoverValue : value;

  return (
    <div className="space-y-1">
      <fieldset
        role="radiogroup"
        aria-label="Product rating from 1 to 5 stars"
        className="flex items-center gap-1.5 p-1"
      >
        <legend className="sr-only">Choose a star rating</legend>
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(null)}
            className="cursor-pointer p-1 rounded-lg focus-within:ring-2 focus-within:ring-[#C9952A] transition-transform hover:scale-110"
          >
            <input
              type="radio"
              name="rating-input"
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            />
            <svg
              className={`w-7 h-7 transition-colors ${
                star <= displayRating
                  ? 'text-[#C9952A] fill-[#C9952A]'
                  : 'text-[#E8E0D5] fill-none stroke-current stroke-2'
              }`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </label>
        ))}
      </fieldset>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
