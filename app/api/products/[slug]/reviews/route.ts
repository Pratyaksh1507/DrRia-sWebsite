import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProductBySlug } from '@/lib/products';
import {
  reviewSubmissionSchema,
  scanCDSCOCompliance,
  checkReviewRateLimit,
  ProductReview,
  ReviewSummary,
} from '@/lib/reviews';
import { checkVerifiedBuyer } from '@/lib/reviews-server';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const product = await getProductBySlug(slug);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const ratingFilter = searchParams.get('rating') ? parseInt(searchParams.get('rating')!, 10) : null;
    const skinTypeFilter = searchParams.get('skin_type');
    const sort = searchParams.get('sort') || 'recent';

    const supabase = await createClient();

    // Fetch approved reviews with filtering and pagination
    let query = supabase
      .from('product_reviews')
      .select('*', { count: 'exact' })
      .eq('product_id', product.id)
      .eq('status', 'approved');

    if (ratingFilter && ratingFilter >= 1 && ratingFilter <= 5) {
      query = query.eq('rating', ratingFilter);
    }

    if (skinTypeFilter && ['dry', 'oily', 'combination', 'sensitive', 'normal'].includes(skinTypeFilter)) {
      query = query.eq('skin_type', skinTypeFilter);
    }

    if (sort === 'helpful') {
      query = query.order('helpful_count', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'highest') {
      query = query.order('rating', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'lowest') {
      query = query.order('rating', { ascending: true }).order('created_at', { ascending: false });
    } else {
      // Default: recent
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: reviews, count, error } = await query;

    if (error) {
      console.warn('[Reviews API] Query error (database may be offline or unmigrated):', error.message);
      // Return empty reviews gracefully rather than failing the page
      const emptySummary: ReviewSummary = {
        averageRating: product.rating || 5.0,
        totalReviews: product.reviewsCount || 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
      return NextResponse.json({
        reviews: [],
        total: 0,
        limit,
        offset,
        summary: emptySummary,
      });
    }

    // Compute distribution and average across all approved reviews for this product
    const { data: allApproved } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', product.id)
      .eq('status', 'approved');

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    const totalCount = allApproved?.length || 0;

    if (allApproved && allApproved.length > 0) {
      for (const row of allApproved) {
        const r = row.rating as keyof typeof distribution;
        if (distribution[r] !== undefined) {
          distribution[r] += 1;
        }
        ratingSum += row.rating;
      }
    }

    const averageRating =
      totalCount > 0 ? parseFloat((ratingSum / totalCount).toFixed(2)) : product.rating || 5.0;

    const summary: ReviewSummary = {
      averageRating,
      totalReviews: totalCount,
      distribution,
    };

    return NextResponse.json({
      reviews: (reviews as ProductReview[]) || [],
      total: count || 0,
      limit,
      offset,
      summary,
    });
  } catch (err) {
    console.error('[Reviews API GET Error]', err);
    return NextResponse.json({ error: 'Unable to load reviews at this time.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Rate Limiting Check
    if (!checkReviewRateLimit(ip, 5, 3600000)) {
      return NextResponse.json(
        { error: 'You have submitted too many reviews recently. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Authentication Check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to share your experience with Dr. Ria.' },
        { status: 401 }
      );
    }

    // 3. Product Validation
    const product = await getProductBySlug(slug);
    if (!product || product.isActive === false) {
      return NextResponse.json({ error: 'Product not found or currently unavailable.' }, { status: 404 });
    }

    // 4. Payload Validation
    const body = await request.json();
    const parseResult = reviewSubmissionSchema.safeParse(body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstIssue ? firstIssue.message : 'Invalid review submission data.' },
        { status: 400 }
      );
    }

    const { rating, headline, comment, customer_name, skin_type } = parseResult.data;

    // 5. CDSCO Regulatory Compliance Scan
    const headlineScan = scanCDSCOCompliance(headline);
    const commentScan = scanCDSCOCompliance(comment);
    const isCompliant = headlineScan.compliant && commentScan.compliant;

    // Non-compliant reviews are routed to pending moderation
    const status = isCompliant ? 'approved' : 'pending';

    // 6. Verified Buyer Check
    const { isVerified, orderId } = await checkVerifiedBuyer(user.id, slug);

    // 7. Insert / Upsert Review via Admin Client
    const adminSupabase = createAdminClient();
    const reviewData = {
      product_id: product.id,
      user_id: user.id,
      order_id: orderId || null,
      rating,
      headline,
      comment,
      customer_name,
      skin_type: skin_type || null,
      verified_buyer: isVerified,
      status,
      updated_at: new Date().toISOString(),
    };

    const { data: insertedReview, error: insertError } = await adminSupabase
      .from('product_reviews')
      .upsert(reviewData, { onConflict: 'product_id,user_id' })
      .select()
      .single();

    if (insertError) {
      console.error('[Reviews API POST Error]', insertError);
      return NextResponse.json(
        { error: 'Could not record your review. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        review: insertedReview,
        message: isCompliant
          ? 'Thank you! Your review has been published.'
          : 'Thank you! Your review is pending clinical review by Dr. Ria and will appear shortly.',
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Reviews API POST Fatal]', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while submitting your review.' },
      { status: 500 }
    );
  }
}
