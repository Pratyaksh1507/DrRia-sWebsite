'use client';

import React, { useState } from 'react';
import { ProductReview } from '@/lib/reviews';
import StarRatingDisplay from './StarRatingDisplay';
import DoctorReplyCard from './DoctorReplyCard';

interface ReviewCardProps {
  review: ProductReview;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count || 0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteMessage, setVoteMessage] = useState<string | null>(null);

  const formattedDate = new Date(review.created_at).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const skinTypeLabels: Record<string, string> = {
    dry: 'Dry Skin',
    oily: 'Oily Skin',
    combination: 'Combination Skin',
    sensitive: 'Sensitive Skin',
    normal: 'Normal Skin',
  };

  const handleHelpfulVote = async () => {
    if (hasVoted || isSubmittingVote) return;
    setIsSubmittingVote(true);
    setVoteMessage(null);

    try {
      const res = await fetch(`/api/reviews/${review.id}/helpful`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.status === 401) {
        setVoteMessage('Please sign in to vote');
        return;
      }

      if (res.ok) {
        setHelpfulCount(data.helpful_count);
        setHasVoted(true);
        if (data.alreadyVoted) {
          setVoteMessage('Already marked helpful');
        }
      } else {
        setVoteMessage(data.error || 'Failed to vote');
      }
    } catch {
      setVoteMessage('Network error');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  return (
    <article className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8E0D5] space-y-4 shadow-2xs transition-shadow hover:shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm sm:text-base text-[#1A1A1A]">
              {review.customer_name}
            </span>
            {review.verified_buyer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EDF6EE] text-[#3A7D44]">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified Buyer
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StarRatingDisplay rating={review.rating} size="sm" />
            <span className="text-xs text-[#6B6B6B]">&bull; {formattedDate}</span>
          </div>
        </div>

        {review.skin_type && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FBF6EE] text-[#5C3D1E] border border-[#E8E0D5]">
            {skinTypeLabels[review.skin_type] || review.skin_type}
          </span>
        )}
      </header>

      {/* Review Content */}
      <div className="space-y-1.5">
        <h4 className="font-semibold text-sm sm:text-base text-[#1A1A1A] leading-snug">
          {review.headline}
        </h4>
        <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed whitespace-pre-line">
          {review.comment}
        </p>
      </div>

      {/* Doctor Clinical Response */}
      {review.admin_response && (
        <DoctorReplyCard
          response={review.admin_response}
          respondedAt={review.admin_responded_at}
        />
      )}

      {/* Footer / Social Proof & Upvote */}
      <footer className="pt-2 flex items-center justify-between text-xs text-[#6B6B6B] border-t border-[#F2ECE4]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleHelpfulVote}
            disabled={hasVoted || isSubmittingVote}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              hasVoted
                ? 'bg-[#EDF6EE] border-[#3A7D44]/30 text-[#3A7D44]'
                : 'bg-white border-[#E8E0D5] hover:bg-[#FBF6EE] text-[#5C3D1E]'
            }`}
            aria-label={`Mark review as helpful. Currently ${helpfulCount} people found this helpful.`}
          >
            <svg
              className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : 'fill-none stroke-current stroke-2'}`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span>{hasVoted ? 'Helpful' : 'Helpful'}</span>
            <span className="font-semibold">({helpfulCount})</span>
          </button>
          {voteMessage && <span className="text-[11px] text-[#5C3D1E]">{voteMessage}</span>}
        </div>
      </footer>
    </article>
  );
}
