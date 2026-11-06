import React from 'react';
import { requireAdmin } from '@/lib/admin-auth';
import { queryDb } from '@/lib/db';
import AdminProductsManager, { AdminProduct } from '@/components/admin/AdminProductsManager';

export default async function AdminProductsPage() {
  await requireAdmin();

  const res = await queryDb<AdminProduct>(
    `SELECT * FROM public.products ORDER BY created_at DESC;`
  );

  return <AdminProductsManager initialProducts={res.rows} />;
}
