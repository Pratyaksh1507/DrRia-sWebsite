import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi, requireRecentAuth, logAdminAudit } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authCheck = await requireAdminApi(request);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.errorResponse.error },
      { status: authCheck.errorResponse.status }
    );
  }

  // Ensure recent MFA verification within 10 minutes for review moderation and reply publication
  const isRecentAuth = await requireRecentAuth(10, { userId: authCheck.user.id });
  if (!isRecentAuth) {
    return NextResponse.json(
      { error: 'Step-up authentication required. Please re-authenticate your admin session.' },
      { status: 403 }
    );
  }

  try {
    const { id: reviewId } = await context.params;
    const body = await request.json();
    const adminSupabase = createAdminClient();

    // 1. Fetch current review state for audit log comparison
    const { data: existingReview, error: fetchError } = await adminSupabase
      .from('product_reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();

    if (fetchError || !existingReview) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!['pending', 'approved', 'rejected'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.is_featured !== undefined) {
      updates.is_featured = Boolean(body.is_featured);
    }

    if (body.admin_response !== undefined) {
      const resp = typeof body.admin_response === 'string' ? body.admin_response.trim() : null;
      if (resp && resp.length > 1000) {
        return NextResponse.json({ error: 'Doctor reply cannot exceed 1000 characters.' }, { status: 400 });
      }
      updates.admin_response = resp || null;
      updates.admin_responded_at = resp ? new Date().toISOString() : null;
    }

    // 2. Perform update
    const { data: updatedReview, error: updateError } = await adminSupabase
      .from('product_reviews')
      .update(updates)
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin Review Update Error]', updateError);
      return NextResponse.json({ error: 'Failed to update review.' }, { status: 500 });
    }

    // 3. Record Audit Log
    const ip = request.headers.get('x-forwarded-for') || null;
    await logAdminAudit({
      adminId: authCheck.user.id,
      action: 'moderate_product_review',
      entityType: 'product_reviews',
      entityId: reviewId,
      oldValue: {
        status: existingReview.status,
        is_featured: existingReview.is_featured,
        admin_response: existingReview.admin_response,
      },
      newValue: updates,
      ip,
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (err) {
    console.error('[Admin Review PATCH Fatal]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authCheck = await requireAdminApi(request);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.errorResponse.error },
      { status: authCheck.errorResponse.status }
    );
  }

  const isRecentAuth = await requireRecentAuth(10, { userId: authCheck.user.id });
  if (!isRecentAuth) {
    return NextResponse.json(
      { error: 'Step-up authentication required to delete reviews.' },
      { status: 403 }
    );
  }

  try {
    const { id: reviewId } = await context.params;
    const adminSupabase = createAdminClient();

    const { data: existingReview } = await adminSupabase
      .from('product_reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    const { error: deleteError } = await adminSupabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      console.error('[Admin Review DELETE Error]', deleteError);
      return NextResponse.json({ error: 'Failed to delete review.' }, { status: 500 });
    }

    const ip = request.headers.get('x-forwarded-for') || null;
    await logAdminAudit({
      adminId: authCheck.user.id,
      action: 'delete_product_review',
      entityType: 'product_reviews',
      entityId: reviewId,
      oldValue: existingReview,
      newValue: null,
      ip,
    });

    return NextResponse.json({ success: true, message: 'Review deleted successfully.' });
  } catch (err) {
    console.error('[Admin Review DELETE Fatal]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
