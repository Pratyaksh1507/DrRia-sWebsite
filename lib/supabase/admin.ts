import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Privileged Supabase client using the Secret / Service Role Key.
 * STRICTLY SERVER-ONLY: NEVER expose this to the browser or import in client components.
 * Genuine use cases:
 * 1. Webhook processing (unauthenticated incoming webhooks from Razorpay)
 * 2. System audit logging (tables with RLS restricted from client write)
 * 3. Single-admin authorization checks (admin_users table has zero client policies)
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Security violation: createAdminClient must strictly be executed on the server.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, secretKey || 'placeholder-service-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
