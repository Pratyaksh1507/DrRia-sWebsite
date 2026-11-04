import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProductBySlug } from '@/data/products';
import { createUpdateCartSchema } from '@/lib/cart-schema';

// Strict Zod schema for cart mutations
export const updateCartSchema = createUpdateCartSchema(
  (slug) => getProductBySlug(slug) !== undefined
);

interface RawCartItem {
  slug?: string;
  quantity?: number;
}

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

    const rawItems: RawCartItem[] =
      cartRecord?.items && Array.isArray(cartRecord.items)
        ? (cartRecord.items as RawCartItem[])
        : [];

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
  } catch (err: unknown) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const validation = updateCartSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { items: cleanItems } = validation.data;

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
  } catch (err: unknown) {
    console.error('[Cart PUT Exception]', err);
    const message = err instanceof Error ? err.message : 'Failed to save cart';
    return NextResponse.json(
      { error: message },
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
  } catch (err: unknown) {
    console.error('[Cart DELETE Exception]', err);
    const message = err instanceof Error ? err.message : 'Failed to clear cart';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
