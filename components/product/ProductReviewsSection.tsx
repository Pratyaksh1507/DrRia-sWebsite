'use client';

import React, { useState, useEffect } from 'react';
import { ProductReview, ReviewSummary } from '@/lib/reviews';
import ReviewSummaryCard from './ReviewSummaryCard';
import ReviewFilterChips from './ReviewFilterChips';
import ReviewCard from './ReviewCard';
import WriteReviewModal from './WriteReviewModal';

interface ProductReviewsSectionProps {
  productSlug: string;
  productName: string;
  initialRating?: number;
  initialReviewsCount?: number;
}

export default function ProductReviewsSection({
  productSlug,
  productName,
  initialRating = 5.0,
  initialReviewsCount = 0,
}: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({
    averageRating: initialRating,
    totalReviews: initialReviewsCount,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [total, setTotal] = useState<number>(initialReviewsCount);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [skinTypeFilter, setSkinTypeFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('recent');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState<boolean>(false);

  const PAGE_SIZE = 6;

  // Initial load and filter change
  useEffect(() => {
    let ignore = false;

    async function loadInitialReviews() {
      try {
        const params = new URLSearchParams();
        params.set('limit', PAGE_SIZE.toString());
        params.set('offset', '0');
        params.set('sort', sort);
        if (ratingFilter !== null) params.set('rating', ratingFilter.toString());
        if (skinTypeFilter !== null) params.set('skin_type', skinTypeFilter);

        const res = await fetch(`/api/products/${productSlug}/reviews?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load reviews');

        const data = await res.json();

        if (!ignore) {
          setReviews(data.reviews || []);
          if (data.summary) {
            setSummary(data.summary);
          }
          setTotal(data.total || 0);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.warn('[ProductReviewsSection] Fetch error:', err);
          setLoading(false);
        }
      }
    }

    loadInitialReviews();

    return () => {
      ignore = true;
    };
  }, [productSlug, ratingFilter, skinTypeFilter, sort]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextOffset = reviews.length;
      const params = new URLSearchParams();
      params.set('limit', PAGE_SIZE.toString());
      params.set('offset', nextOffset.toString());
      params.set('sort', sort);
      if (ratingFilter !== null) params.set('rating', ratingFilter.toString());
      if (skinTypeFilter !== null) params.set('skin_type', skinTypeFilter);

      const res = await fetch(`/api/products/${productSlug}/reviews?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load more reviews');

      const data = await res.json();
      setReviews((prev) => [...prev, ...(data.reviews || [])]);
      if (data.summary) {
        setSummary(data.summary);
      }
      setTotal(data.total || 0);
    } catch (err) {
      console.warn('[ProductReviewsSection] Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReviewSubmitted = (newReview: ProductReview) => {
    // If approved immediately, insert at top
    if (newReview.status === 'approved') {
      setReviews((prev) => [newReview, ...prev]);
      setTotal((prev) => prev + 1);
      setSummary((prev) => {
        const nextDist = { ...prev.distribution };
        const r = newReview.rating as keyof typeof nextDist;
        if (nextDist[r] !== undefined) nextDist[r] += 1;
        const newTotal = prev.totalReviews + 1;
        const newSum = prev.averageRating * prev.totalReviews + newReview.rating;
        return {
          totalReviews: newTotal,
          averageRating: parseFloat((newSum / newTotal).toFixed(2)),
          distribution: nextDist,
        };
      });
    }
  };

  const hasMore = reviews.length < total;

  return (
    <section id="reviews" className="mt-16 sm:mt-24 pt-12 sm:pt-16 border-t border-[#E8E0D5]">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
          Authentic Feedback
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1A1A1A]">
          Clinical Reviews &amp; Results
        </h2>
        <p className="text-xs sm:text-sm text-[#6B6B6B]">
          Explore unedited feedback, skin-type suitability, and clinical advice directly from Dr. Ria&apos;s clients.
        </p>
      </div>

      {/* Summary Scorecard & Breakdown */}
      <div className="mb-10">
        <ReviewSummaryCard
          summary={summary}
          onWriteReviewClick={() => setIsWriteModalOpen(true)}
          onSelectRatingFilter={(star) => setRatingFilter(star)}
          activeRatingFilter={ratingFilter}
        />
      </div>

      {/* Filter Chips & Sorting */}
      <div className="mb-8">
        <ReviewFilterChips
          ratingFilter={ratingFilter}
          onRatingChange={(r) => setRatingFilter(r)}
          skinTypeFilter={skinTypeFilter}
          onSkinTypeChange={(st) => setSkinTypeFilter(st)}
          sort={sort}
          onSortChange={(s) => setSort(s)}
          totalResults={total}
        />
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#6B6B6B]">
          <div className="w-6 h-6 border-2 border-[#5C3D1E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#E8E0D5] text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FBF6EE] text-[#5C3D1E] flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
            {ratingFilter !== null || skinTypeFilter !== null
              ? 'No reviews match your filters'
              : 'Be the first to share your experience'}
          </h3>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto">
            {ratingFilter !== null || skinTypeFilter !== null
              ? 'Try resetting your filter chips to see reviews across all ratings and skin types.'
              : `Have you used ${productName}? Let Dr. Ria and other shoppers know how it worked for your skin.`}
          </p>
          <div className="pt-2">
            {ratingFilter !== null || skinTypeFilter !== null ? (
              <button
                type="button"
                onClick={() => {
                  setRatingFilter(null);
                  setSkinTypeFilter(null);
                }}
                className="inline-flex items-center px-4 py-2 rounded-full bg-[#FBF6EE] border border-[#E8E0D5] text-xs font-semibold text-[#5C3D1E] hover:bg-[#F2ECE4]"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#3E2914]"
              >
                Write the First Review
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <ReviewCard key={rev.id} review={rev} />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-6 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white border border-[#E8E0D5] text-xs font-semibold text-[#5C3D1E] hover:bg-[#FBF6EE] active:scale-95 transition-all shadow-2xs disabled:opacity-60"
              >
                {loadingMore ? 'Loading More...' : `Show More Reviews (${total - reviews.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Submission Modal */}
      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        productSlug={productSlug}
        productName={productName}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </section>
  );
}
