import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const authCheck = await requireAdminApi(request);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { error: authCheck.errorResponse.error },
      { status: authCheck.errorResponse.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const productId = searchParams.get('product_id');
    const search = searchParams.get('search')?.trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from('product_reviews')
      .select('*, products(id, name, slug)', { count: 'exact' });

    if (status && status !== 'all' && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,headline.ilike.%${search}%,comment.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: reviews, count, error } = await query;

    if (error) {
      console.error('[Admin Reviews API Fetch Error]', error);
      return NextResponse.json({ error: 'Failed to fetch reviews.' }, { status: 500 });
    }

    // Tally overall status counts for the dashboard header
    const { count: pendingCount } = await adminSupabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: approvedCount } = await adminSupabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: rejectedCount } = await adminSupabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    return NextResponse.json({
      reviews: reviews || [],
      total: count || 0,
      counts: {
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
        total: (pendingCount || 0) + (approvedCount || 0) + (rejectedCount || 0),
      },
      limit,
      offset,
    });
  } catch (err) {
    console.error('[Admin Reviews API Fatal Error]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
