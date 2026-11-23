import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Server-only helper: Resolves whether the user is an authoritative "Verified Buyer" by inspecting past orders.
 */
export async function checkVerifiedBuyer(
  userId: string,
  productSlug: string
): Promise<{ isVerified: boolean; orderId?: string }> {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('orders')
      .select('id, status, order_items!inner(product_slug)')
      .eq('user_id', userId)
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])
      .eq('order_items.product_slug', productSlug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return { isVerified: true, orderId: data.id };
    }
  } catch (err) {
    console.warn('[checkVerifiedBuyer] Error verifying order history:', err);
  }

  return { isVerified: false };
}
