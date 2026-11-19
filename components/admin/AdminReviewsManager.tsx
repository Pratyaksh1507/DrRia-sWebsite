'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProductReview, scanCDSCOCompliance } from '@/lib/reviews';

interface ReviewWithProduct extends ProductReview {
  products?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface ReviewCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function AdminReviewsManager() {
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [counts, setCounts] = useState<ReviewCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Load reviews on tab or search change
  useEffect(() => {
    let ignore = false;

    async function loadReviews() {
      try {
        const params = new URLSearchParams();
        if (activeTab !== 'all') params.set('status', activeTab);
        if (searchTerm.trim()) params.set('search', searchTerm.trim());

        const res = await fetch(`/api/admin/reviews?${params.toString()}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/admin/login');
            return;
          }
          throw new Error('Failed to load reviews');
        }

        const data = await res.json();
        if (!ignore) {
          setReviews(data.reviews || []);
          if (data.counts) {
            setCounts(data.counts);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error('[AdminReviewsManager] Fetch Error', err);
          setActionError('Could not load reviews. Please verify database connectivity.');
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      ignore = true;
    };
  }, [activeTab, searchTerm, router]);

  const refreshReviews = async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('[AdminReviewsManager] Refresh error', err);
    }
  };

  const handleUpdateStatus = async (reviewId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setActionError('Step-up authentication required. Please re-authenticate your admin session.');
          router.push('/admin/mfa/challenge');
          return;
        }
        throw new Error(data.error || 'Failed to update review status');
      }

      setActionSuccess(`Review marked as ${newStatus}.`);
      await refreshReviews();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleSaveReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_response: replyText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          router.push('/admin/mfa/challenge');
          return;
        }
        throw new Error(data.error || 'Failed to post reply');
      }

      setActionSuccess("Dr. Ria's clinical reply published successfully.");
      setActiveReplyId(null);
      setReplyText('');
      await refreshReviews();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Reply failed');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
            Review Moderation &amp; Community
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1">
            Manage customer reviews, enforce CDSCO cosmetic compliance, and publish official clinical advice.
          </p>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
            Pending Moderation
          </span>
          <span
            className={`font-serif text-2xl font-bold mt-1 block ${
              counts.pending > 0 ? 'text-[#C9952A]' : 'text-[#1A1A1A]'
            }`}
          >
            {counts.pending}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
            Approved Reviews
          </span>
          <span className="font-serif text-2xl font-bold text-[#3A7D44] mt-1 block">
            {counts.approved}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
            Rejected / Voided
          </span>
          <span className="font-serif text-2xl font-bold text-red-600 mt-1 block">
            {counts.rejected}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8E0D5] shadow-2xs">
          <span className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider block">
            Total Submissions
          </span>
          <span className="font-serif text-2xl font-bold text-[#1A1A1A] mt-1 block">
            {counts.total}
          </span>
        </div>
      </div>

      {/* Action Alerts */}
      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#EDF6EE] border border-[#3A7D44]/30 text-xs sm:text-sm text-[#3A7D44] font-medium">
          {actionSuccess}
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8E0D5] pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-[#5C3D1E] text-white'
                  : 'bg-white border border-[#E8E0D5] text-[#6B6B6B] hover:text-[#1A1A1A]'
              }`}
            >
              {tab === 'all' ? 'All Reviews' : tab}
              {tab === 'pending' && counts.pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#C9952A] text-white text-[10px]">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#C9952A]"
          />
        </div>
      </div>

      {/* Reviews Table / List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#6B6B6B]">
          <div className="w-6 h-6 border-2 border-[#5C3D1E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-[#E8E0D5] text-xs text-[#6B6B6B]">
          No reviews found in this category.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const headlineScan = scanCDSCOCompliance(rev.headline);
            const commentScan = scanCDSCOCompliance(rev.comment);
            const hasCDSCOFlag = !headlineScan.compliant || !commentScan.compliant;
            const flaggedTerm = headlineScan.matchedTerm || commentScan.matchedTerm;

            return (
              <div
                key={rev.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8E0D5] space-y-4 shadow-2xs"
              >
                {/* Card Top Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-base text-[#1A1A1A]">
                        {rev.customer_name}
                      </span>
                      {rev.verified_buyer && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDF6EE] text-[#3A7D44]">
                          Verified Buyer
                        </span>
                      )}
                      {rev.skin_type && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FBF6EE] text-[#5C3D1E] capitalize">
                          {rev.skin_type} Skin
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          rev.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : rev.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {rev.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
                      <span className="font-bold text-[#C9952A]">{rev.rating} ★</span>
                      <span>&bull;</span>
                      <span>
                        Product:{' '}
                        {rev.products?.slug ? (
                          <Link
                            href={`/products/${rev.products.slug}`}
                            target="_blank"
                            className="font-medium text-[#5C3D1E] underline"
                          >
                            {rev.products.name}
                          </Link>
                        ) : (
                          'Dr. Ria Product'
                        )}
                      </span>
                      <span>&bull;</span>
                      <span>{new Date(rev.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Moderation Action Buttons */}
                  <div className="flex items-center gap-2">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-[#3A7D44] text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {rev.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReplyId(activeReplyId === rev.id ? null : rev.id);
                        setReplyText(rev.admin_response || '');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E8E0D5] text-[#5C3D1E] text-xs font-semibold hover:bg-[#FBF6EE] transition-colors"
                    >
                      {rev.admin_response ? 'Edit Doctor Reply' : 'Reply as Doctor'}
                    </button>
                  </div>
                </div>

                {/* CDSCO Regulatory Warning Banner */}
                {hasCDSCOFlag && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      <strong>CDSCO Compliance Alert:</strong> Contains restricted medicinal/drug keyword (&quot;{flaggedTerm}&quot;). Verify claims do not promise to cure disease before approving.
                    </span>
                  </div>
                )}

                {/* Review Text */}
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-[#1A1A1A]">{rev.headline}</h4>
                  <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {/* Existing Doctor Reply */}
                {rev.admin_response && activeReplyId !== rev.id && (
                  <div className="p-3.5 rounded-xl bg-[#FBF6EE] border border-[#E8E0D5] text-xs space-y-1">
                    <span className="font-bold text-[#5C3D1E] block">Dr. Ria&apos;s Clinical Reply:</span>
                    <p className="text-[#3E2914] italic">&ldquo;{rev.admin_response}&rdquo;</p>
                  </div>
                )}

                {/* Reply Drawer / Inline Input */}
                {activeReplyId === rev.id && (
                  <div className="pt-3 border-t border-[#E8E0D5] space-y-2">
                    <label className="block text-xs font-semibold text-[#5C3D1E]">
                      Official Clinical Reply from Dr. Ria:
                    </label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write dermatological advice, formulation guidance, or client appreciation..."
                      maxLength={1000}
                      className="w-full text-xs p-3 rounded-xl border border-[#E8E0D5] bg-[#FDFBF7] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#C9952A]"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
                      <span>{replyText.length} / 1000 characters</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(null)}
                          className="px-3 py-1.5 text-xs text-[#6B6B6B] hover:text-[#1A1A1A]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReply || !replyText.trim()}
                          onClick={() => handleSaveReply(rev.id)}
                          className="px-4 py-1.5 rounded-full bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#3E2914] disabled:opacity-50"
                        >
                          {isSubmittingReply ? 'Publishing...' : 'Publish Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
