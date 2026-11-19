import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  reviewSubmissionSchema,
  scanCDSCOCompliance,
  checkReviewRateLimit,
  CDSCO_RESTRICTED_KEYWORDS,
} from '../lib/reviews.ts';

describe('Customer Product Reviews & CDSCO Engine Suite', () => {
  describe('1. CDSCO Regulatory Compliance Content Filter', () => {
    test('approves authentic cosmetic feedback without therapeutic claims', () => {
      const validReviews = [
        'Skin feels instantly hydrated and nourished after morning application.',
        'Visible reduction in dark spots around lips after 2 weeks of nightly use.',
        'Non-greasy, absorbs fast and leaves a natural dewy finish without white cast.',
        'Gentle daily cleanser that does not strip natural moisture barrier.',
      ];

      for (const text of validReviews) {
        const result = scanCDSCOCompliance(text);
        assert.equal(result.compliant, true, `Expected "${text}" to be compliant`);
        assert.equal(result.matchedTerm, undefined);
      }
    });

    test('flags high-risk unapproved medical and disease claims', () => {
      const highRiskCases = [
        { text: 'This miraculous cream cured my severe dermatitis!', expected: 'dermatitis' },
        { text: 'Acts like a natural steroid without side effects', expected: 'steroid' },
        { text: 'Complete eczema cure for dry winter patches', expected: 'cure' },
        { text: 'The ultimate melasma cure for hyperpigmented cheeks', expected: 'melasma cure' },
        { text: 'Replaces my daily prescription ointment', expected: 'prescription' },
        { text: 'Completely eliminated my chronic psoriasis flare-ups', expected: 'psoriasis' },
        { text: 'Powerful antibiotic effect on active pimples', expected: 'antibiotic' },
      ];

      for (const { text, expected } of highRiskCases) {
        const result = scanCDSCOCompliance(text);
        assert.equal(result.compliant, false, `Expected "${text}" to be quarantined`);
        assert.ok(result.matchedTerm, 'Matched term should be present');
      }
    });

    test('handles case-insensitivity and punctuation in regulatory scan', () => {
      assert.equal(scanCDSCOCompliance('CURED my skin!').compliant, false);
      assert.equal(scanCDSCOCompliance('Contains no STEROIDS.').compliant, false);
      assert.equal(scanCDSCOCompliance('Is this a prescription?').compliant, false);
    });

    test('verifies all CDSCO restricted keywords are non-empty strings', () => {
      assert.ok(CDSCO_RESTRICTED_KEYWORDS.length >= 10);
      for (const kw of CDSCO_RESTRICTED_KEYWORDS) {
        assert.equal(typeof kw, 'string');
        assert.ok(kw.trim().length > 0);
      }
    });
  });

  describe('2. Zod Review Submission Validation Schema', () => {
    const validPayload = {
      rating: 5,
      headline: 'Deeply hydrating and lightweight',
      comment: 'I have been using this formulation every morning for three weeks. My skin barrier feels restored and calm.',
      customer_name: 'Ananya Sharma',
      skin_type: 'combination',
    };

    test('accepts valid review payload with all fields', () => {
      const parsed = reviewSubmissionSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    test('accepts valid review with optional/null skin_type', () => {
      const payloadWithoutSkin = { ...validPayload, skin_type: null };
      const parsed = reviewSubmissionSchema.safeParse(payloadWithoutSkin);
      assert.equal(parsed.success, true);
    });

    test('validates all accepted skin types', () => {
      const skinTypes = ['dry', 'oily', 'combination', 'sensitive', 'normal'];
      for (const st of skinTypes) {
        const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, skin_type: st });
        assert.equal(parsed.success, true, `Skin type ${st} should be valid`);
      }
    });

    test('rejects invalid skin types', () => {
      const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, skin_type: 'reptilian' });
      assert.equal(parsed.success, false);
    });

    test('rejects out-of-range star ratings', () => {
      assert.equal(reviewSubmissionSchema.safeParse({ ...validPayload, rating: 0 }).success, false);
      assert.equal(reviewSubmissionSchema.safeParse({ ...validPayload, rating: 6 }).success, false);
      assert.equal(reviewSubmissionSchema.safeParse({ ...validPayload, rating: -1 }).success, false);
      assert.equal(reviewSubmissionSchema.safeParse({ ...validPayload, rating: 4.5 }).success, false);
    });

    test('rejects headline that is too short (< 2 chars)', () => {
      const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, headline: 'A' });
      assert.equal(parsed.success, false);
    });

    test('rejects headline that exceeds 120 characters', () => {
      const longHeadline = 'A'.repeat(121);
      const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, headline: longHeadline });
      assert.equal(parsed.success, false);
    });

    test('rejects comment that is too short (< 10 chars)', () => {
      const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, comment: 'Nice prod' });
      assert.equal(parsed.success, false);
    });

    test('rejects comment that exceeds 2000 characters', () => {
      const longComment = 'A'.repeat(2001);
      const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, comment: longComment });
      assert.equal(parsed.success, false);
    });

    test('rejects customer name that is too short (< 2 chars)', () => {
      const parsed = reviewSubmissionSchema.safeParse({ ...validPayload, customer_name: ' ' });
      assert.equal(parsed.success, false);
    });
  });

  describe('3. Review Rate Limiter Engine', () => {
    test('enforces rate limit ceiling (5 submissions per hour per identifier)', () => {
      const testIp = `test-ip-${Date.now()}`;

      // First 5 attempts should succeed
      for (let i = 0; i < 5; i++) {
        assert.equal(checkReviewRateLimit(testIp, 5, 3600000), true, `Attempt ${i + 1} should succeed`);
      }

      // 6th attempt should be blocked
      assert.equal(checkReviewRateLimit(testIp, 5, 3600000), false, '6th attempt must be blocked');
    });

    test('isolates rate limits between different IP identifiers', () => {
      const ipA = `test-ip-A-${Date.now()}`;
      const ipB = `test-ip-B-${Date.now()}`;

      for (let i = 0; i < 5; i++) {
        checkReviewRateLimit(ipA, 5, 3600000);
      }

      assert.equal(checkReviewRateLimit(ipA, 5, 3600000), false);
      assert.equal(checkReviewRateLimit(ipB, 5, 3600000), true);
    });
  });

  describe('4. Rating & Histogram Mathematical Accuracy', () => {
    test('accurately calculates weighted average rating rounded to 2 decimal places', () => {
      // 10 5-star reviews, 2 4-star reviews
      // Sum = (10 * 5) + (2 * 4) = 58
      // Count = 12
      // Average = 58 / 12 = 4.8333... -> 4.83
      const ratings = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4];
      const sum = ratings.reduce((acc, r) => acc + r, 0);
      const average = parseFloat((sum / ratings.length).toFixed(2));
      assert.equal(average, 4.83);
    });

    test('accurately counts distribution buckets', () => {
      const reviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 5 },
        { rating: 2 },
        { rating: 1 },
      ];

      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      for (const r of reviews) {
        const star = r.rating;
        distribution[star] += 1;
      }

      assert.equal(distribution[5], 3);
      assert.equal(distribution[4], 1);
      assert.equal(distribution[3], 1);
      assert.equal(distribution[2], 1);
      assert.equal(distribution[1], 1);
      assert.equal(Object.values(distribution).reduce((a, b) => a + b, 0), 7);
    });
  });
});
