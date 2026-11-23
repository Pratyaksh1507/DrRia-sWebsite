'use client';

import React, { useState, useEffect } from 'react';
import StarRatingInput from './StarRatingInput';
import { ProductReview, SkinType } from '@/lib/reviews';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productSlug: string;
  productName: string;
  onReviewSubmitted: (newReview: ProductReview) => void;
}

export default function WriteReviewModal({
  isOpen,
  onClose,
  productSlug,
  productName,
  onReviewSubmitted,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [customerName, setCustomerName] = useState('');
  const [skinType, setSkinType] = useState<SkinType | ''>('');
  const [headline, setHeadline] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating.');
      return;
    }

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage('Please provide your name (at least 2 characters).');
      return;
    }

    if (!headline.trim() || headline.trim().length < 2) {
      setErrorMessage('Please write a short review headline (at least 2 characters).');
      return;
    }

    if (!comment.trim() || comment.trim().length < 10) {
      setErrorMessage('Please write at least 10 characters detailing your experience.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/products/${productSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          customer_name: customerName.trim(),
          skin_type: skinType || null,
          headline: headline.trim(),
          comment: comment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to submit review. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(data.message || 'Thank you! Your review has been recorded.');
      if (data.review) {
        onReviewSubmitted(data.review);
      }

      setTimeout(() => {
        onClose();
        // Reset form
        setHeadline('');
        setComment('');
        setSuccessMessage(null);
      }, 1800);
    } catch {
      setErrorMessage('Network connection error. Please check your internet and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E8E0D5] my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FBF6EE] transition-colors"
          aria-label="Close review dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <header className="mb-6 space-y-1 pr-8">
          <span className="text-xs uppercase font-semibold tracking-wider text-[#C9952A]">
            Share Your Experience
          </span>
          <h3 id="write-review-title" className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A]">
            Review {productName}
          </h3>
          <p className="text-xs text-[#6B6B6B]">
            Help our clinical community understand how this formulation works for your skin.
          </p>
        </header>

        {successMessage ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EDF6EE] text-[#3A7D44] flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Star Rating Picker */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                Overall Rating <span className="text-red-500">*</span>
              </label>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>

            {/* Customer Name */}
            <div>
              <label htmlFor="customer-name" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="customer-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ananya Sharma"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] bg-[#FDFBF7] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#C9952A]"
              />
            </div>

            {/* Skin Type */}
            <div>
              <label htmlFor="skin-type" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                Your Skin Type (Optional)
              </label>
              <select
                id="skin-type"
                value={skinType}
                onChange={(e) => setSkinType(e.target.value as SkinType)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] bg-[#FDFBF7] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#C9952A]"
              >
                <option value="">Select your skin type...</option>
                <option value="combination">Combination Skin</option>
                <option value="dry">Dry Skin</option>
                <option value="oily">Oily Skin</option>
                <option value="sensitive">Sensitive Skin</option>
                <option value="normal">Normal Skin</option>
              </select>
            </div>

            {/* Headline */}
            <div>
              <label htmlFor="review-headline" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                Headline / Key Takeaway <span className="text-red-500">*</span>
              </label>
              <input
                id="review-headline"
                type="text"
                required
                maxLength={120}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Visible reduction in dark spots after 2 weeks"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] bg-[#FDFBF7] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#C9952A]"
              />
            </div>

            {/* Comment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="review-comment" className="block text-xs font-semibold text-[#1A1A1A]">
                  Detailed Experience <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-[#6B6B6B]">
                  {comment.length} / 2000
                </span>
              </div>
              <textarea
                id="review-comment"
                required
                rows={4}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share how this product felt, texture, application routine, and observed results on your skin..."
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] bg-[#FDFBF7] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#C9952A] leading-relaxed"
              />
            </div>

            <p className="text-[11px] text-[#6B6B6B] leading-normal italic">
              Dr. Ria&apos;s prioritizes clinical transparency. In accordance with Indian cosmetic regulations, reviews containing medical disease or unapproved drug claims may undergo moderation before publication.
            </p>

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#5C3D1E] text-white text-xs font-semibold tracking-wide hover:bg-[#3E2914] active:scale-95 transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
