'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  category: 'lips' | 'skin' | 'hair' | 'sun' | string;
  tagline: string | null;
  description: string | null;
  price: number;
  mrp: number;
  stock_quantity: number;
  hsn_code: string;
  tax_rate: number | string;
  is_active: boolean;
  deleted_at: string | null;
  badge: string | null;
  image_url: string | null;
  rating: number | string | null;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

interface AdminProductsManagerProps {
  initialProducts: AdminProduct[];
}

export default function AdminProductsManager({
  initialProducts,
}: AdminProductsManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Form states for Add Product
  const [addForm, setAddForm] = useState({
    name: '',
    slug: '',
    category: 'skin',
    tagline: '',
    description: '',
    price: '',
    mrp: '',
    stock_quantity: '100',
    hsn_code: '3304',
    tax_rate: '18',
    is_active: false,
    badge: '',
    image_url: '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<AdminProduct>>({});

  // Loading & status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 6000);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.hsn_code && p.hsn_code.includes(search));

    const matchesCategory =
      categoryFilter === 'all' || p.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && p.is_active) ||
      (statusFilter === 'unpublished' && !p.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // KPI aggregates
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const totalStock = products.reduce((acc, p) => acc + (Number(p.stock_quantity) || 0), 0);

  // Handle Image Upload
  const handleFileUpload = async (
    file: File,
    target: 'add' | 'edit'
  ) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      if (target === 'add') {
        setAddForm((prev) => ({ ...prev, image_url: data.url }));
      } else {
        setEditForm((prev) => ({ ...prev, image_url: data.url }));
      }
      showNotice('success', 'Image successfully uploaded to Supabase Storage');
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle active status directly
  const handleToggleStatus = async (product: AdminProduct) => {
    const newStatus = !product.is_active;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? data.product : p))
      );
      showNotice(
        'success',
        `${product.name} is now ${newStatus ? 'Published on Storefront' : 'Unpublished'}`
      );
      router.refresh();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Add Product
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: addForm.name,
        slug: addForm.slug,
        category: addForm.category,
        tagline: addForm.tagline,
        description: addForm.description,
        price: parseInt(addForm.price, 10),
        mrp: parseInt(addForm.mrp, 10),
        stock_quantity: parseInt(addForm.stock_quantity, 10),
        hsn_code: addForm.hsn_code,
        tax_rate: parseFloat(addForm.tax_rate),
        is_active: addForm.is_active,
        badge: addForm.badge,
        image_url: addForm.image_url,
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      setProducts((prev) => [data.product, ...prev]);
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        slug: '',
        category: 'skin',
        tagline: '',
        description: '',
        price: '',
        mrp: '',
        stock_quantity: '100',
        hsn_code: '3304',
        tax_rate: '18',
        is_active: false,
        badge: '',
        image_url: '',
      });
      showNotice('success', `Formulation "${data.product.name}" added successfully.`);
      router.refresh();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Creation error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (product: AdminProduct) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      tagline: product.tagline || '',
      description: product.description || '',
      price: product.price,
      mrp: product.mrp,
      stock_quantity: product.stock_quantity,
      hsn_code: product.hsn_code,
      tax_rate: Number(product.tax_rate),
      is_active: product.is_active,
      badge: product.badge || '',
      image_url: product.image_url || '',
      category: product.category,
    });
  };

  // Submit Edit Product
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.name !== undefined) payload.name = editForm.name;
      if (editForm.tagline !== undefined) payload.tagline = editForm.tagline;
      if (editForm.description !== undefined) payload.description = editForm.description;
      if (editForm.price !== undefined) payload.price = Number(editForm.price);
      if (editForm.mrp !== undefined) payload.mrp = Number(editForm.mrp);
      if (editForm.stock_quantity !== undefined)
        payload.stock_quantity = Number(editForm.stock_quantity);
      if (editForm.hsn_code !== undefined) payload.hsn_code = editForm.hsn_code;
      if (editForm.tax_rate !== undefined) payload.tax_rate = Number(editForm.tax_rate);
      if (editForm.is_active !== undefined) payload.is_active = editForm.is_active;
      if (editForm.badge !== undefined) payload.badge = editForm.badge;
      if (editForm.image_url !== undefined) payload.image_url = editForm.image_url;
      if (editForm.category !== undefined) payload.category = editForm.category;

      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? data.product : p))
      );
      setEditingProduct(null);
      showNotice(
        'success',
        `Changes to "${data.product.name}" persisted and audit logged.`
      );
      router.refresh();
    } catch (err: unknown) {
      showNotice('error', err instanceof Error ? err.message : 'Update error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {notice && (
        <div
          role="status"
          className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all shadow-xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E0D5]">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#5C3D1E]">
            Product Catalogue Management
          </h1>
          <p className="text-sm text-[#5C3D1E]/70 mt-1">
            Authoritative database control for pricing, inventory, tax classification, and publication status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors shadow-xs"
        >
          <svg className="w-4 h-4 text-[#C9952A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Formulation</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E8E0D5] rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
            Total Formulations
          </p>
          <p className="text-2xl font-bold font-serif text-[#5C3D1E] mt-1">{totalCount}</p>
        </div>

        <div className="bg-white border border-[#E8E0D5] rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3A7D44]">
            Storefront Active
          </p>
          <p className="text-2xl font-bold font-serif text-[#3A7D44] mt-1">{activeCount}</p>
        </div>

        <div className="bg-white border border-[#E8E0D5] rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
            Unpublished / Review
          </p>
          <p className="text-2xl font-bold font-serif text-amber-700 mt-1">{inactiveCount}</p>
        </div>

        <div className="bg-white border border-[#E8E0D5] rounded-xl p-4 shadow-2xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
            Total Inventory Units
          </p>
          <p className="text-2xl font-bold font-serif text-[#5C3D1E] mt-1">{totalStock}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#FAF4EA] border border-[#E8E0D5] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-2xs">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search formulation name, slug, or HSN code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8E0D5] rounded-lg text-xs text-[#1A1A1A] placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          />
          <svg
            className="w-4 h-4 text-[#6B6B6B] absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E8E0D5] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          >
            <option value="all">All Categories</option>
            <option value="skin">Facial Care (Skin)</option>
            <option value="lips">Lip Care</option>
            <option value="hair">Hair Care</option>
            <option value="sun">Sun Care</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E8E0D5] rounded-lg text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="unpublished">Unpublished Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#E8E0D5] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F4EE] border-b border-[#E8E0D5] text-[#5C3D1E] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Formulation</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price &bull; MRP</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">HSN &bull; GST</th>
                <th className="py-3 px-4">Storefront Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E0D5]/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[#6B6B6B]">
                    No formulations match the current search filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-[#FAF4EA]/50 transition-colors">
                      {/* Name & Thumbnail */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image_url || '/images/hydroboost-moisturizer-lifestyle-768.webp'}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-[#E8E0D5] bg-[#FAF4EA] shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-sm text-[#1A1A1A]">{p.name}</p>
                            <p className="text-[11px] text-[#6B6B6B] font-mono">{p.slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3EBDD] text-[#5C3D1E]">
                          {p.category}
                        </span>
                      </td>

                      {/* Pricing */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="text-[#5C3D1E] font-bold text-sm">
                          ₹{p.price.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-[#6B6B6B] flex items-center gap-1">
                          <span>MRP: ₹{p.mrp.toLocaleString('en-IN')}</span>
                          {discount > 0 && (
                            <span className="text-amber-700 font-bold">({discount}% off)</span>
                          )}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-semibold text-xs ${
                            p.stock_quantity > 10
                              ? 'bg-emerald-50 text-emerald-800'
                              : p.stock_quantity > 0
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          {p.stock_quantity} units
                        </span>
                      </td>

                      {/* Tax & HSN */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[#1A1A1A] text-xs">HSN {p.hsn_code}</div>
                        <div className="text-[11px] text-[#6B6B6B]">{p.tax_rate}% GST</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            Unpublished
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            disabled={isSubmitting}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                              p.is_active
                                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {p.is_active ? 'Unpublish' : 'Publish'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#5C3D1E] text-white hover:bg-[#7A532B] transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E8E0D5] max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E0D5]">
              <h2 className="font-serif text-xl font-bold text-[#5C3D1E]">
                Add New Formulation
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#6B6B6B] hover:text-[#1A1A1A] text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Formulation Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                      setAddForm((prev) => ({ ...prev, name, slug }));
                    }}
                    placeholder="e.g. Niacinamide Clarifying Serum"
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Slug / URL Path *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.slug}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="niacinamide-clarifying-serum"
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Category *
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  >
                    <option value="skin">Facial Care (Skin)</option>
                    <option value="lips">Lip Care</option>
                    <option value="hair">Hair Care</option>
                    <option value="sun">Sun Care</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={addForm.price}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="e.g. 444"
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    M.R.P. (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={addForm.mrp}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, mrp: e.target.value }))
                    }
                    placeholder="e.g. 444"
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Inventory Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={addForm.stock_quantity}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, stock_quantity: e.target.value }))
                    }
                    placeholder="100"
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    HSN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.hsn_code}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, hsn_code: e.target.value }))
                    }
                    placeholder="3304"
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    GST Rate (%) *
                  </label>
                  <select
                    value={addForm.tax_rate}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, tax_rate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Standard Cosmetic)</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={addForm.tagline}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  placeholder="e.g. Deep Moisture & Barrier Defence"
                  className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={addForm.description}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Detailed cosmetic description..."
                  className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Product Image (Supabase Storage)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/webp,image/jpeg,image/png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0], 'add');
                      }
                    }}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#5C3D1E] file:text-white hover:file:bg-[#7A532B]"
                  />
                  {isUploading && (
                    <span className="text-xs text-amber-700 animate-pulse">
                      Uploading to bucket...
                    </span>
                  )}
                </div>
                {addForm.image_url && (
                  <p className="mt-1 text-[11px] text-[#3A7D44] truncate">
                    Uploaded: {addForm.image_url}
                  </p>
                )}
              </div>

              {/* Status checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="add_is_active"
                  checked={addForm.is_active}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="rounded text-[#5C3D1E] focus:ring-[#5C3D1E]"
                />
                <label htmlFor="add_is_active" className="text-xs font-semibold text-[#1A1A1A]">
                  Publish immediately to storefront (Uncheck to keep unpublished pending review)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E0D5]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E0D5] rounded-lg font-semibold text-[#5C3D1E] hover:bg-[#FAF4EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-5 py-2 bg-[#5C3D1E] text-white rounded-lg font-semibold hover:bg-[#7A532B] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Formulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E8E0D5] max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E0D5]">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#5C3D1E]">
                  Edit Formulation
                </h2>
                <p className="text-xs text-[#6B6B6B] font-mono">{editingProduct.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-[#6B6B6B] hover:text-[#1A1A1A] text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Formulation Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Category
                  </label>
                  <select
                    value={editForm.category || 'skin'}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  >
                    <option value="skin">Facial Care (Skin)</option>
                    <option value="lips">Lip Care</option>
                    <option value="hair">Hair Care</option>
                    <option value="sun">Sun Care</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.price ?? ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        price: e.target.value ? parseInt(e.target.value, 10) : 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    M.R.P. (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.mrp ?? ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        mrp: e.target.value ? parseInt(e.target.value, 10) : 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Inventory Units *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock_quantity ?? ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        stock_quantity: e.target.value ? parseInt(e.target.value, 10) : 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    HSN Code (GST Classification)
                  </label>
                  <input
                    type="text"
                    value={editForm.hsn_code || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, hsn_code: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">
                    Tax Rate (%)
                  </label>
                  <select
                    value={editForm.tax_rate ?? 18}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tax_rate: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12% (AYUSH)</option>
                    <option value="18">18% (Standard Cosmetic)</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={editForm.tagline || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-[#E8E0D5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                />
              </div>

              {/* Upload image */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Update Formulation Image
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/webp,image/jpeg,image/png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0], 'edit');
                      }
                    }}
                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#5C3D1E] file:text-white hover:file:bg-[#7A532B]"
                  />
                  {isUploading && (
                    <span className="text-xs text-amber-700 animate-pulse">
                      Uploading to bucket...
                    </span>
                  )}
                </div>
                {editForm.image_url && (
                  <p className="mt-1 text-[11px] text-[#3A7D44] truncate">
                    Current: {editForm.image_url}
                  </p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active ?? false}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="rounded text-[#5C3D1E] focus:ring-[#5C3D1E]"
                />
                <label htmlFor="edit_is_active" className="text-xs font-semibold text-[#1A1A1A]">
                  Published on Storefront (Uncheck to hide formulation)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E0D5]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-[#E8E0D5] rounded-lg font-semibold text-[#5C3D1E] hover:bg-[#FAF4EA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-5 py-2 bg-[#5C3D1E] text-white rounded-lg font-semibold hover:bg-[#7A532B] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Persist Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

