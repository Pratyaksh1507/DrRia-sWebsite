import React from 'react';
import { ReviewSummary } from '@/lib/reviews';
import StarRatingDisplay from './StarRatingDisplay';

interface ReviewSummaryCardProps {
  summary: ReviewSummary;
  onWriteReviewClick: () => void;
  onSelectRatingFilter?: (star: number | null) => void;
  activeRatingFilter?: number | null;
}

export default function ReviewSummaryCard({
  summary,
  onWriteReviewClick,
  onSelectRatingFilter,
  activeRatingFilter,
}: ReviewSummaryCardProps) {
  const { averageRating, totalReviews, distribution } = summary;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E8E0D5] shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Column: Overall Score */}
        <div className="md:col-span-5 text-center md:text-left space-y-3 border-b md:border-b-0 md:border-r border-[#E8E0D5] pb-6 md:pb-0 md:pr-6">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#C9952A]">
            Customer Experience
          </span>
          <div className="flex items-baseline justify-center md:justify-start gap-2">
            <span className="font-serif text-5xl sm:text-6xl font-bold text-[#1A1A1A]">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-sm sm:text-base text-[#6B6B6B] font-medium">/ 5.0</span>
          </div>

          <StarRatingDisplay rating={averageRating} size="lg" />

          <p className="text-xs text-[#6B6B6B]">
            Based on <span className="font-semibold text-[#1A1A1A]">{totalReviews}</span> verified
            customer reviews
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={onWriteReviewClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#5C3D1E] text-white text-xs sm:text-sm font-semibold tracking-wide hover:bg-[#3E2914] active:scale-95 transition-all shadow-sm"
            >
              <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Write a Review
            </button>
          </div>
        </div>

        {/* Right Column: Rating Breakdown Histogram */}
        <div className="md:col-span-7 space-y-2.5">
          <span className="block text-xs uppercase font-semibold tracking-wider text-[#6B6B6B] mb-2">
            Rating Distribution
          </span>

          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star as keyof typeof distribution] || 0;
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            const isSelected = activeRatingFilter === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => onSelectRatingFilter?.(isSelected ? null : star)}
                className={`w-full flex items-center gap-3 text-xs text-left group p-1 rounded-lg transition-colors ${
                  isSelected ? 'bg-[#FBF6EE] font-semibold text-[#5C3D1E]' : 'hover:bg-[#FDFBF7] text-[#6B6B6B]'
                }`}
                aria-label={`Filter by ${star} star reviews: ${count} reviews (${percentage}%)`}
              >
                <div className="flex items-center gap-1 w-12 sm:w-14 shrink-0 font-medium text-[#1A1A1A]">
                  <span>{star}</span>
                  <svg className="w-3.5 h-3.5 text-[#C9952A] fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>

                {/* Progress bar track */}
                <div className="flex-1 h-2 rounded-full bg-[#E8E0D5]/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#C9952A] transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="w-16 sm:w-20 text-right shrink-0 flex items-center justify-end gap-1.5">
                  <span className="font-semibold text-[#1A1A1A]">{count}</span>
                  <span className="text-[10px] text-[#6B6B6B]/80">({percentage}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
