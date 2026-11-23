import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';

export const instant = false;

/**
 * Administrator Entry Page (/admin)
 * - Unauthenticated users -> redirected to /admin/login
 * - Authenticated non-admin customers -> denied access (notFound() / stealth 404)
 * - Authenticated admins with AAL1 -> redirected to MFA challenge
 * - Verified AAL2 administrators -> redirected to /admin/products
 */
export default async function AdminEntryPage() {
  await requireAdmin();
  redirect('/admin/products');
}
