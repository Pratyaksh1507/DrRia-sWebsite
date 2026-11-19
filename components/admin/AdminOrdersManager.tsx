'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface OrderItem {
  id?: string;
  product_slug: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  tax_rate?: number;
  taxable_amount?: number;
  tax_amount?: number;
}

export interface AdminOrder {
  id: string;
  user_id: string | null;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal: number;
  shipping: number;
  total: number;
  address_snapshot: {
    name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  idempotency_key?: string | null;
  courier_name?: string | null;
  awb_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  pendingFulfillment: number;
  pendingPayment: number;
  inTransit: number;
  delivered: number;
}

interface AdminOrdersManagerProps {
  initialOrders: AdminOrder[];
  initialMetrics: OrderMetrics;
}

const COURIER_PRESETS = [
  'Delhivery',
  'Blue Dart',
  'Shiprocket',
  'DTDC',
  'India Post',
  'Shadowfax',
  'Ecom Express',
];

export default function AdminOrdersManager({
  initialOrders,
  initialMetrics,
}: AdminOrdersManagerProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [metrics, setMetrics] = useState<OrderMetrics>(initialMetrics);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected order for Detail & Fulfillment Modal
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);

  // Form states for fulfillment update
  const [editStatus, setEditStatus] = useState<AdminOrder['status']>('pending');
  const [courierName, setCourierName] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 6000);
  };

  const openOrderModal = (order: AdminOrder) => {
    setActiveOrder(order);
    setEditStatus(order.status);
    setCourierName(order.courier_name || '');
    setAwbNumber(order.awb_number || '');
    setTrackingUrl(order.tracking_url || '');
    setCancellationReason(order.cancellation_reason || '');
  };

  const closeOrderModal = () => {
    setActiveOrder(null);
  };

  // Helper to suggest tracking URL based on courier and AWB
  const handleAwbChange = (awb: string) => {
    setAwbNumber(awb);
    if (!trackingUrl && awb.trim()) {
      if (courierName === 'Delhivery') {
        setTrackingUrl(`https://www.delhivery.com/track/package/${awb.trim()}`);
      } else if (courierName === 'Blue Dart') {
        setTrackingUrl(`https://www.bluedart.com/tracking?trackNumber=${awb.trim()}`);
      } else if (courierName === 'India Post') {
        setTrackingUrl(`https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`);
      }
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${activeOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          courier_name: courierName.trim() || null,
          awb_number: awbNumber.trim() || null,
          tracking_url: trackingUrl.trim() || null,
          cancellation_reason:
            editStatus === 'cancelled' ? cancellationReason.trim() || null : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'mfa_step_up_required') {
          showNotice(
            'error',
            'Recent MFA step-up required (valid for 10 minutes). Please verify your TOTP code.'
          );
          setTimeout(() => {
            router.push(`/admin/mfa/challenge?next=/admin/orders`);
          }, 1500);
          return;
        }
        throw new Error(data.error || 'Failed to update order');
      }

      // Update local state
      const updated = data.order;
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );

      // Re-fetch metrics if status changed
      if (activeOrder.status !== updated.status) {
        setMetrics((prev) => {
          const next = { ...prev };
          if (activeOrder.status === 'paid' && updated.status === 'processing') {
            // remains in pendingFulfillment
          } else if (
            ['paid', 'processing'].includes(activeOrder.status) &&
            updated.status === 'shipped'
          ) {
            next.pendingFulfillment = Math.max(0, next.pendingFulfillment - 1);
            next.inTransit += 1;
          } else if (activeOrder.status === 'shipped' && updated.status === 'delivered') {
            next.inTransit = Math.max(0, next.inTransit - 1);
            next.delivered += 1;
          } else if (updated.status === 'cancelled') {
            if (['paid', 'processing'].includes(activeOrder.status)) {
              next.pendingFulfillment = Math.max(0, next.pendingFulfillment - 1);
            }
          }
          return next;
        });
      }

      showNotice('success', `Order #${activeOrder.id} updated successfully.`);
      closeOrderModal();
    } catch (err: unknown) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'An error occurred while saving the order.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: AdminOrder['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-[#EDF6EE] text-[#3A7D44] border-[#C5E5C9]';
      case 'processing':
        return 'bg-[#F0F4FF] text-[#3B82F6] border-[#BFDBFE]';
      case 'shipped':
        return 'bg-[#EBF3F8] text-[#244E6E] border-[#C5DCEB]';
      case 'delivered':
        return 'bg-[#EAF5EC] text-[#2D6A4F] border-[#B7E4C7]';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
      default:
        return 'bg-[#FAF5EA] text-[#7A532B] border-[#E8E0D5]';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'to_ship'
        ? ['paid', 'processing'].includes(order.status)
        : order.status === statusFilter;

    const term = search.toLowerCase().trim();
    if (!term) return matchesStatus;

    const addr = order.address_snapshot || {};
    const matchesSearch =
      order.id.toLowerCase().includes(term) ||
      (addr.name && addr.name.toLowerCase().includes(term)) ||
      (addr.phone && addr.phone.includes(term)) ||
      (addr.city && addr.city.toLowerCase().includes(term)) ||
      (order.awb_number && order.awb_number.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E2914]">
            Order Management & Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Track customer orders, manage packing status, and assign AWB shipping labels.
          </p>
        </div>

        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E8E0D5] text-[#5C3D1E] hover:bg-[#FAF5EA] transition-colors shadow-2xs self-start sm:self-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Orders
        </button>
      </div>

      {/* Notification Toast */}
      {notice && (
        <div
          role="status"
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border flex items-center justify-between gap-3 shadow-2xs ${
            notice.type === 'success'
              ? 'bg-[#EDF6EE] border-[#C5E5C9] text-[#3A7D44]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span>{notice.message}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-bold hover:opacity-70 p-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E0D5] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
            Total Revenue
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-[#3E2914]">
            ₹{metrics.totalRevenue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-[#6B6B6B]">
            From {metrics.totalOrders} total order{metrics.totalOrders === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E0D5] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B82F6]">
            Needs Fulfillment
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-[#3B82F6]">
            {metrics.pendingFulfillment}
          </p>
          <span className="text-[10px] text-[#6B6B6B]">Paid & ready to ship</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E0D5] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#244E6E]">
            In Transit
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-[#244E6E]">
            {metrics.inTransit}
          </p>
          <span className="text-[10px] text-[#6B6B6B]">With courier partner</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E0D5] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A7D44]">
            Delivered
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-[#3A7D44]">
            {metrics.delivered}
          </p>
          <span className="text-[10px] text-[#6B6B6B]">Successfully completed</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E0D5] shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A532B]">
            Pending / COD
          </span>
          <p className="font-serif text-xl sm:text-2xl font-bold text-[#7A532B]">
            {metrics.pendingPayment}
          </p>
          <span className="text-[10px] text-[#6B6B6B]">Awaiting confirmation</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E0D5] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'to_ship', label: 'To Fulfill' },
              { id: 'shipped', label: 'In Transit' },
              { id: 'delivered', label: 'Delivered' },
              { id: 'pending', label: 'Pending' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-[#5C3D1E] text-white shadow-2xs'
                    : 'bg-[#FAF5EA] text-[#5C3D1E] hover:bg-[#F3EBDD]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, phone, AWB..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E8E0D5] text-xs bg-[#FBF6EE]/40 focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
            />
            <svg
              className="w-4 h-4 text-[#6B6B6B] absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-[#E8E0D5] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF5EA] border-b border-[#E8E0D5] text-[#5C3D1E] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tracking</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EBDD] text-[#3E2914]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-[#6B6B6B]">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const addr = order.address_snapshot || {};
                  const itemsCount = (order.items || []).reduce(
                    (sum, i) => sum + (i.quantity || 1),
                    0
                  );
                  const isCod = !order.razorpay_payment_id;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FBF6EE]/60 transition-colors"
                    >
                      {/* ID & Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#5C3D1E]">
                        #{order.id}
                        <span className="block font-sans text-[11px] font-normal text-[#6B6B6B] mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold block truncate max-w-[150px]">
                          {addr.name || 'Anonymous Guest'}
                        </span>
                        <span className="text-[11px] text-[#6B6B6B] block">
                          {addr.phone || 'No phone'}
                        </span>
                        <span className="text-[10px] text-[#6B6B6B]/80 block">
                          {addr.city ? `${addr.city}, ${addr.pincode || ''}` : ''}
                        </span>
                      </td>

                      {/* Products */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#5C3D1E]">
                          {itemsCount} item{itemsCount === 1 ? '' : 's'}
                        </span>
                        <span className="block text-[11px] text-[#6B6B6B] truncate max-w-[160px]">
                          {(order.items || []).map((i) => i.product_name).join(', ')}
                        </span>
                      </td>

                      {/* Amount & Method */}
                      <td className="py-3.5 px-4">
                        <span className="font-serif font-bold text-sm block">
                          ₹{order.total.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-[#6B6B6B]">
                          {isCod ? 'Cash on Delivery' : 'Online Prepaid'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Tracking / AWB */}
                      <td className="py-3.5 px-4">
                        {order.awb_number ? (
                          <div>
                            <span className="font-mono text-[11px] font-semibold text-[#244E6E] block">
                              {order.awb_number}
                            </span>
                            <span className="text-[10px] text-[#6B6B6B] block">
                              {order.courier_name || 'Courier'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#6B6B6B]/60 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openOrderModal(order)}
                          className="px-3 py-1.5 rounded-lg bg-[#FAF5EA] text-[#5C3D1E] hover:bg-[#5C3D1E] hover:text-white font-semibold text-xs transition-colors border border-[#E8E0D5]"
                        >
                          Fulfill / View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fulfillment & Details Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E8E0D5] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-6 p-6 sm:p-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F3EBDD]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9952A]">
                  Order Fulfillment
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#3E2914]">
                  Order #{activeOrder.id}
                </h2>
              </div>
              <button
                onClick={closeOrderModal}
                className="w-8 h-8 rounded-full bg-[#FAF5EA] text-[#5C3D1E] hover:bg-[#E8E0D5] flex items-center justify-center text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Customer & Address Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FBF6EE] p-4 rounded-2xl border border-[#E8E0D5]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] block mb-1">
                  Customer & Contact
                </span>
                <p className="font-semibold text-sm text-[#3E2914]">
                  {activeOrder.address_snapshot?.name || 'Anonymous Guest'}
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  Phone: {activeOrder.address_snapshot?.phone || 'N/A'}
                </p>
                <p className="text-xs text-[#6B6B6B]">
                  Payment: {activeOrder.razorpay_payment_id ? `Razorpay (${activeOrder.razorpay_payment_id})` : 'Cash on Delivery'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] block mb-1">
                  Delivery Destination
                </span>
                <p className="text-xs text-[#3E2914]">
                  {activeOrder.address_snapshot?.line1}
                  {activeOrder.address_snapshot?.line2 ? `, ${activeOrder.address_snapshot.line2}` : ''}
                </p>
                <p className="text-xs text-[#3E2914]">
                  {activeOrder.address_snapshot?.city}, {activeOrder.address_snapshot?.state} - {activeOrder.address_snapshot?.pincode}
                </p>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                Purchased Formulations ({activeOrder.items?.length || 0})
              </span>
              <div className="border border-[#F3EBDD] rounded-xl overflow-hidden divide-y divide-[#F3EBDD] text-xs">
                {(activeOrder.items || []).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#3E2914] block">
                        {item.product_name}
                      </span>
                      <span className="text-[11px] text-[#6B6B6B]">
                        Qty: {item.quantity} &bull; Unit: ₹{item.unit_price}
                      </span>
                    </div>
                    <span className="font-serif font-bold text-[#5C3D1E]">
                      ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-2 px-1">
                <span>Total Amount</span>
                <span className="font-serif text-base text-[#5C3D1E]">
                  ₹{activeOrder.total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Status & Courier Fulfillment Form */}
            <form onSubmit={handleUpdateOrder} className="space-y-4 pt-4 border-t border-[#F3EBDD]">
              <h3 className="font-serif text-lg font-bold text-[#3E2914]">
                Update Fulfillment & Shipping
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#5C3D1E] mb-1">
                    Fulfillment Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AdminOrder['status'])}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E0D5] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
                  >
                    <option value="pending">Pending (Awaiting Payment / COD)</option>
                    <option value="paid">Paid (Payment Received)</option>
                    <option value="processing">Processing (Packing Order)</option>
                    <option value="shipped">Shipped (Dispatched with Courier)</option>
                    <option value="delivered">Delivered (Handed to Customer)</option>
                    <option value="cancelled">Cancelled (Voided Order)</option>
                  </select>
                </div>

                {/* Courier Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#5C3D1E] mb-1">
                    Courier Partner
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      list="courier-list"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g. Delhivery, Blue Dart"
                      className="w-full px-3 py-2 rounded-xl border border-[#E8E0D5] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
                    />
                    <datalist id="courier-list">
                      {COURIER_PRESETS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* AWB Number */}
                <div>
                  <label className="block text-xs font-semibold text-[#5C3D1E] mb-1">
                    AWB Tracking Number
                  </label>
                  <input
                    type="text"
                    value={awbNumber}
                    onChange={(e) => handleAwbChange(e.target.value)}
                    placeholder="e.g. 14238719283"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E0D5] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
                  />
                </div>

                {/* Tracking URL */}
                <div>
                  <label className="block text-xs font-semibold text-[#5C3D1E] mb-1">
                    Tracking URL (Direct Link)
                  </label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://delhivery.com/track/..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E0D5] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
                  />
                </div>
              </div>

              {/* Cancellation Reason if cancelled */}
              {editStatus === 'cancelled' && (
                <div>
                  <label className="block text-xs font-semibold text-red-700 mb-1">
                    Cancellation Reason (Audited)
                  </label>
                  <input
                    type="text"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="e.g. Customer requested cancellation / unreachable address"
                    className="w-full px-3 py-2 rounded-xl border border-red-200 text-xs bg-red-50/50 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeOrderModal}
                  className="px-4 py-2 rounded-xl border border-[#E8E0D5] text-xs font-semibold text-[#6B6B6B] hover:bg-[#FAF5EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Fulfillment Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
