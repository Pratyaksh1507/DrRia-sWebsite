import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: reviewId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to vote on review helpfulness.' },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // 1. Verify review exists and is approved
    const { data: review, error: reviewError } = await adminSupabase
      .from('product_reviews')
      .select('id, helpful_count, status')
      .eq('id', reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    // 2. Check for duplicate vote
    const { data: existingVote } = await adminSupabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({
        message: 'You have already marked this review as helpful.',
        helpful_count: review.helpful_count,
        alreadyVoted: true,
      });
    }

    // 3. Record vote
    const ip = request.headers.get('x-forwarded-for') || null;
    const { error: voteInsertError } = await adminSupabase
      .from('review_helpful_votes')
      .insert({
        review_id: reviewId,
        user_id: user.id,
        ip_address: ip,
      });

    if (voteInsertError) {
      console.error('[Helpful Vote Insert Error]', voteInsertError);
      return NextResponse.json({ error: 'Failed to record vote.' }, { status: 500 });
    }

    // 4. Increment count on product_reviews
    const newCount = (review.helpful_count || 0) + 1;
    await adminSupabase
      .from('product_reviews')
      .update({ helpful_count: newCount })
      .eq('id', reviewId);

    return NextResponse.json({
      success: true,
      helpful_count: newCount,
    });
  } catch (err) {
    console.error('[Helpful Vote Fatal Error]', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your vote.' },
      { status: 500 }
    );
  }
}
