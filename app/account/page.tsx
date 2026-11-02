import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileSection from '@/components/account/ProfileSection';
import AddressesSection from '@/components/account/AddressesSection';
import OrdersSection, { Order } from '@/components/account/OrdersSection';

export const metadata: Metadata = {
  title: "My Account | Dr Ria's Skincare & Haircare",
  description: 'Manage your profile, delivery addresses, and track recent orders.',
  robots: {
    index: false,
    follow: false,
  },
};

function AccountLoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      <div className="h-32 bg-white rounded-3xl border border-[#E8E0D5]" />
      <div className="h-10 w-80 bg-white/70 rounded-xl" />
      <div className="h-64 bg-white rounded-3xl border border-[#E8E0D5]" />
    </div>
  );
}

async function AccountContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/account');
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch addresses
  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  // Fetch orders with order items
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const initialProfile = {
    id: user.id,
    full_name: profile?.full_name || (user.user_metadata?.full_name as string) || '',
    phone: profile?.phone || (user.user_metadata?.phone as string) || user.phone || '',
    email: user.email || '',
  };

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recent Member';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E0D5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Customer Account
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E2914]">
            Welcome back, {initialProfile.full_name || initialProfile.email.split('@')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B]">
            {initialProfile.email} &bull; Member since {memberSince}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/shop"
            className="px-4 py-2 rounded-xl border border-[#5C3D1E] text-[#5C3D1E] text-xs font-semibold hover:bg-[#5C3D1E] hover:text-white transition-colors"
          >
            Shop Formulations
          </a>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#FAF5EA] text-[#7A532B] border border-[#E8E0D5] text-xs font-semibold hover:bg-[#F3EBDD] transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Quick Anchor Navigation */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 text-xs">
        <a
          href="#orders"
          className="px-4 py-2 rounded-xl bg-white border border-[#E8E0D5] font-semibold text-[#5C3D1E] hover:border-[#5C3D1E] shrink-0 transition-colors"
        >
          Order History ({orders?.length || 0})
        </a>
        <a
          href="#addresses"
          className="px-4 py-2 rounded-xl bg-white border border-[#E8E0D5] font-semibold text-[#5C3D1E] hover:border-[#5C3D1E] shrink-0 transition-colors"
        >
          Saved Delivery Addresses ({addresses?.length || 0})
        </a>
        <a
          href="#profile"
          className="px-4 py-2 rounded-xl bg-white border border-[#E8E0D5] font-semibold text-[#5C3D1E] hover:border-[#5C3D1E] shrink-0 transition-colors"
        >
          Profile &amp; Contact Details
        </a>
      </div>

      {/* Account Sections Grid */}
      <div className="space-y-8">
        {/* Order History */}
        <OrdersSection orders={(orders as Order[]) || []} />

        {/* Saved Addresses */}
        <AddressesSection initialAddresses={addresses || []} userId={user.id} />

        {/* Profile & Contact Details */}
        <ProfileSection initialProfile={initialProfile} />
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#FBF6EE] py-10 sm:py-16">
      <Suspense fallback={<AccountLoadingSkeleton />}>
        <AccountContent />
      </Suspense>
    </main>
  );
}
