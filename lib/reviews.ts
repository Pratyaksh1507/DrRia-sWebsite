import { z } from 'zod';

export type SkinType = 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string | null;
  order_id: string | null;
  rating: number;
  headline: string;
  comment: string;
  customer_name: string;
  skin_type: SkinType | null;
  verified_buyer: boolean;
  status: ReviewStatus;
  is_featured: boolean;
  helpful_count: number;
  admin_response: string | null;
  admin_responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * High-risk medicinal, drug, and therapeutic claim keywords under India's
 * Drugs & Cosmetics Act 1940 and Consumer Protection (E-Commerce) Rules 2020.
 * Cosmetic formulations cannot claim to cure diseases or alter medical pathology.
 * Reviews containing these triggers are quarantined to status='pending'.
 */
export const CDSCO_RESTRICTED_KEYWORDS = [
  'cure',
  'cured',
  'cures',
  'curing',
  'heal',
  'healed',
  'steroid',
  'steroids',
  'eczema',
  'melasma cure',
  'prescription',
  'disease',
  'diseases',
  'psoriasis',
  'dermatitis',
  'bleaching',
  'antibiotic',
  'fungal infection',
  'alopecia cure',
];

/**
 * Scans review text for high-risk regulatory keywords.
 */
export function scanCDSCOCompliance(text: string): { compliant: boolean; matchedTerm?: string } {
  const lower = text.toLowerCase();
  for (const term of CDSCO_RESTRICTED_KEYWORDS) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lower)) {
      return { compliant: false, matchedTerm: term };
    }
  }
  return { compliant: true };
}

/**
 * Zod validation schema for review creation / update.
 */
export const reviewSubmissionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  headline: z
    .string()
    .trim()
    .min(2, 'Headline must be at least 2 characters')
    .max(120, 'Headline cannot exceed 120 characters'),
  comment: z
    .string()
    .trim()
    .min(10, 'Review must be at least 10 characters')
    .max(2000, 'Review cannot exceed 2000 characters'),
  customer_name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters'),
  skin_type: z.enum(['dry', 'oily', 'combination', 'sensitive', 'normal']).optional().nullable(),
});

export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

/**
 * In-memory sliding window rate limiter (default: 5 reviews per hour per key).
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkReviewRateLimit(identifier: string, limit = 5, windowMs = 3600000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

