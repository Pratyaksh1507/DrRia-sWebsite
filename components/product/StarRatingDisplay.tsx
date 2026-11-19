import React from 'react';

interface StarRatingDisplayProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showNumber?: boolean;
}

export default function StarRatingDisplay({
  rating,
  max = 5,
  size = 'md',
  className = '',
  showNumber = false,
}: StarRatingDisplayProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const starSize = sizeClasses[size];
  const clampedRating = Math.max(0, Math.min(max, rating));

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} aria-label={`Rating: ${clampedRating.toFixed(1)} out of ${max} stars`}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => {
          const fillPercentage = Math.max(0, Math.min(1, clampedRating - index)) * 100;

          return (
            <div key={index} className="relative inline-block">
              {/* Background empty star */}
              <svg
                className={`${starSize} text-[#E8E0D5] fill-current`}
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              {/* Foreground filled star with clip */}
              {fillPercentage > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPercentage}%` }}
                >
                  <svg
                    className={`${starSize} text-[#C9952A] fill-current`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-semibold text-[#5C3D1E]">
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
