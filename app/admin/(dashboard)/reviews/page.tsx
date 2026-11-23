import React from 'react';
import { requireAdmin } from '@/lib/admin-auth';
import AdminReviewsManager from '@/components/admin/AdminReviewsManager';

export const metadata = {
  title: 'Reviews Moderation | Dr Ria Admin',
};

export default async function AdminReviewsPage() {
  await requireAdmin();

  return <AdminReviewsManager />;
}
