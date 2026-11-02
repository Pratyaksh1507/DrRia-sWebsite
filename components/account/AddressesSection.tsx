'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Address {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

interface AddressesSectionProps {
  initialAddresses: Address[];
  userId: string;
}

export default function AddressesSection({
  initialAddresses,
  userId,
}: AddressesSectionProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const openAddForm = () => {
    setEditId(null);
    setFormData({
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      is_default: addresses.length === 0,
    });
    setErrorMsg('');
    setIsEditing(true);
  };

  const openEditForm = (addr: Address) => {
    setEditId(addr.id);
    setFormData({
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      is_default: addr.is_default,
    });
    setErrorMsg('');
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (formData.is_default) {
        // Unset default on other addresses
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      if (editId) {
        // Update
        const { error } = await supabase
          .from('addresses')
          .update({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            line1: formData.line1.trim(),
            line2: formData.line2.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
            is_default: formData.is_default,
          })
          .eq('id', editId)
          .eq('user_id', userId);

        if (error) throw error;

        setAddresses((prev) =>
          prev.map((a) =>
            a.id === editId
              ? { ...a, ...formData, id: editId }
              : formData.is_default
              ? { ...a, is_default: false }
              : a
          )
        );
      } else {
        // Insert
        const { data, error } = await supabase
          .from('addresses')
          .insert({
            user_id: userId,
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            line1: formData.line1.trim(),
            line2: formData.line2.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
            is_default: formData.is_default,
          })
          .select()
          .single();

        if (error) throw error;

        setAddresses((prev) => [
          ...(formData.is_default ? prev.map((a) => ({ ...a, is_default: false })) : prev),
          data,
        ]);
      }

      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save address.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete address.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
      await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', userId);

      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update default address.');
    }
  };

  return (
    <div id="addresses" className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3E2914]">
            Saved Delivery Addresses
          </h2>
          <p className="mt-1 text-xs text-[#6B6B6B]">
            Manage shipping destinations for swift one-click checkout.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors shadow-xs"
          >
            <span>+ Add New Address</span>
          </button>
        )}
      </div>

      {/* Address Form (Add / Edit) */}
      {isEditing && (
        <form onSubmit={handleSave} className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#E8E0D5] space-y-4 animate-fade-in">
          <h3 className="font-serif text-base font-bold text-[#3E2914]">
            {editId ? 'Edit Address' : 'Add New Delivery Address'}
          </h3>

          {errorMsg && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Mobile Number (10 digits)</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">House / Flat No., Street, Building</label>
              <input
                type="text"
                required
                value={formData.line1}
                onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Area, Colony, Landmark (Optional)</label>
              <input
                type="text"
                value={formData.line2}
                onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">City / Town</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">State</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">PIN Code (6 digits)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E0D5] bg-white text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="default-check"
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-[#5C3D1E] rounded border-[#E8E0D5]"
              />
              <label htmlFor="default-check" className="text-xs font-medium text-[#1A1A1A] cursor-pointer">
                Set as default address
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[#5C3D1E] text-white text-xs font-semibold hover:bg-[#7A532B] transition-colors"
            >
              {loading ? 'Saving...' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-[#E8E0D5] text-[#6B6B6B] text-xs font-semibold hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      {addresses.length === 0 && !isEditing ? (
        <div className="text-center py-12 border border-dashed border-[#E8E0D5] rounded-2xl p-6">
          <p className="text-sm text-[#6B6B6B]">You have no saved addresses yet.</p>
          <button
            type="button"
            onClick={openAddForm}
            className="mt-3 text-xs font-semibold text-[#5C3D1E] underline hover:text-[#C9952A]"
          >
            Add your primary shipping address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-5 rounded-2xl border transition-all ${
                addr.is_default ? 'border-[#5C3D1E] bg-[#FDFBF7] shadow-2xs' : 'border-[#E8E0D5] bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-semibold text-sm text-[#1A1A1A]">{addr.name}</span>
                {addr.is_default && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EDF6EE] text-[#3A7D44]">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                {addr.line1}
                {addr.line2 && `, ${addr.line2}`}
                <br />
                {addr.city}, {addr.state} — {addr.pincode}
              </p>
              <p className="text-xs text-[#5C3D1E] mt-2 font-medium">
                Phone: +91 {addr.phone}
              </p>

              <div className="mt-4 pt-3 border-t border-[#F3EBDD] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditForm(addr)}
                    className="font-semibold text-[#5C3D1E] hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-[#E8E0D5]">&bull;</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
                {!addr.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-[11px] text-[#7A532B] hover:text-[#5C3D1E] underline"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
