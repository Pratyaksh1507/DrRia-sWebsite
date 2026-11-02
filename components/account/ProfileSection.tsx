'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProfileSectionProps {
  initialProfile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
  };
}

export default function ProfileSection({ initialProfile }: ProfileSectionProps) {
  const [fullName, setFullName] = useState(initialProfile.full_name || '');
  const [phone, setPhone] = useState(initialProfile.phone || '');
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedMessage('');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: initialProfile.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      setSavedMessage('Profile details updated successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="profile" className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E0D5] shadow-xs space-y-6">
      <div>
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3E2914]">
          Personal Profile
        </h2>
        <p className="mt-1 text-xs text-[#6B6B6B]">
          Update your contact details for notifications and order receipts.
        </p>
      </div>

      {savedMessage && (
        <div role="status" className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700">
          ✓ {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="profile-email" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
            Email Address
          </label>
          <input
            id="profile-email"
            type="email"
            disabled
            value={initialProfile.email || ''}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8E0D5] bg-[#FDFBF7] text-[#6B6B6B] text-sm cursor-not-allowed"
          />
          <span className="text-[11px] text-[#8C7866] mt-1 block">
            Email is verified and linked to your authentication account.
          </span>
        </div>

        <div>
          <label htmlFor="profile-name" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
            Full Name
          </label>
          <input
            id="profile-name"
            type="text"
            required
            placeholder="Sachin Kashyap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8E0D5] bg-white text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          />
        </div>

        <div>
          <label htmlFor="profile-phone" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
            Contact Number
          </label>
          <input
            id="profile-phone"
            type="tel"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8E0D5] bg-white text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-[#5C3D1E] text-white text-xs sm:text-sm font-semibold hover:bg-[#7A532B] transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
}
