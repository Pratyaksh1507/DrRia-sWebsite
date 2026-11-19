import 'server-only';
import { queryDb } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export interface StockAdjustmentItem {
  slug: string;
  quantity: number;
}

/**
 * Decrements product stock quantities upon confirmed order placement or payment capture.
 * If stock reaches 0, atomically marks in_stock as false.
 */
export async function decrementProductStock(
  items: StockAdjustmentItem[]
): Promise<{ success: boolean; updated: number }> {
  if (!items || items.length === 0) {
    return { success: true, updated: 0 };
  }

  let updatedCount = 0;

  // 1. Try atomic PostgreSQL direct query via queryDb pool
  try {
    for (const item of items) {
      if (item.quantity <= 0) continue;
      const res = await queryDb(
        `UPDATE public.products
         SET stock_quantity = GREATEST(0, stock_quantity - $1),
             in_stock = CASE WHEN (stock_quantity - $1) <= 0 THEN false ELSE in_stock END,
             updated_at = NOW()
         WHERE slug = $2;`,
        [item.quantity, item.slug]
      );
      if (res.rowCount && res.rowCount > 0) {
        updatedCount += res.rowCount;
      }
    }
    return { success: true, updated: updatedCount };
  } catch (dbErr) {
    console.warn('[Inventory] Direct queryDb stock decrement unavailable, falling back to Supabase API:', dbErr);
  }

  // 2. Fallback via Supabase Admin Client
  try {
    const adminSupabase = createAdminClient();
    for (const item of items) {
      if (item.quantity <= 0) continue;

      const { data: product } = await adminSupabase
        .from('products')
        .select('id, stock_quantity, in_stock')
        .eq('slug', item.slug)
        .single();

      if (product) {
        const newStock = Math.max(0, (product.stock_quantity ?? 0) - item.quantity);
        await adminSupabase
          .from('products')
          .update({
            stock_quantity: newStock,
            in_stock: newStock > 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        updatedCount += 1;
      }
    }
    return { success: true, updated: updatedCount };
  } catch (apiErr) {
    console.error('[Inventory] Failed to update stock via fallback Supabase client:', apiErr);
    return { success: false, updated: updatedCount };
  }
}
