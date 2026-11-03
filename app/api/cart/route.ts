import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProductBySlug } from '@/data/products';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: cartRecord, error } = await adminSupabase
      .from('carts')
      .select('items')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Cart Fetch Error]', error);
    }

    const rawItems: Array<{ slug: string; quantity: number }> =
      cartRecord?.items && Array.isArray(cartRecord.items) ? cartRecord.items : [];

    const validatedItems = [];
    let droppedCount = 0;

    for (const raw of rawItems) {
      if (!raw || !raw.slug) continue;
      const product = getProductBySlug(raw.slug);
      if (!product) {
        droppedCount += 1;
        continue;
      }
      validatedItems.push({
        product,
        quantity: Math.min(10, Math.max(1, Number(raw.quantity) || 1)),
      });
    }

    // Prune invalid items from server if any were dropped
    if (droppedCount > 0 && adminSupabase) {
      try {
        await adminSupabase.from('carts').upsert({
          user_id: user.id,
          items: validatedItems.map((i) => ({
            slug: i.product.slug,
            quantity: i.quantity,
          })),
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    return NextResponse.json({
      items: validatedItems,
      droppedCount,
    });
  } catch (err: any) {
    console.error('[Cart GET Exception]', err);
    return NextResponse.json({ items: [], droppedCount: 0 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    const cleanItems = rawItems
      .filter((i: any) => i && typeof i.slug === 'string')
      .map((i: any) => ({
        slug: i.slug,
        quantity: Math.min(10, Math.max(1, Number(i.quantity) || 1)),
      }));

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from('carts').upsert({
      user_id: user.id,
      items: cleanItems,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('[Cart Upsert Warning]', error);
    }

    return NextResponse.json({ success: true, count: cleanItems.length });
  } catch (err: any) {
    console.error('[Cart PUT Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save cart' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    await adminSupabase.from('carts').delete().eq('user_id', user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Cart DELETE Exception]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to clear cart' },
      { status: 500 }
    );
  }
}
