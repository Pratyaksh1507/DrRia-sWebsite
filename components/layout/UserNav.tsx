'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/lib/cart';

export default function UserNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    // Initial check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (event === 'SIGNED_IN' && u) {
        useCartStore.getState().syncOnLogin({ id: u.id, email: u.email });
      } else if (event === 'SIGNED_OUT') {
        useCartStore.getState().resetOnLogout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    useCartStore.getState().resetOnLogout();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const loginHref =
    pathname && pathname !== '/login'
      ? `/login?next=${encodeURIComponent(pathname)}`
      : '/login';

  // Signed out state: person icon linking to login with tooltip
  if (!user) {
    return (
      <Link
        href={loginHref}
        aria-label="Sign in"
        className="group relative min-w-[44px] min-h-[44px] p-2.5 rounded-full text-[#5C3D1E] hover:text-[#C9952A] hover:bg-[#F3EBDD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] flex items-center justify-center"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        {/* Tooltip on hover */}
        <span
          role="tooltip"
          className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-[#3E2914] text-[#FBF6EE] text-[11px] font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shadow-md z-50"
        >
          Sign in
        </span>
      </Link>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Account';

  // Signed in state: person icon with dot + dropdown
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label="Account"
        className="group relative min-w-[44px] min-h-[44px] p-2.5 rounded-full text-[#5C3D1E] hover:text-[#C9952A] hover:bg-[#F3EBDD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] flex items-center justify-center"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        {/* Small dot on the icon when signed in */}
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#3A7D44] ring-2 ring-[#FBF6EE]"
          aria-hidden="true"
        />
        {/* Tooltip on hover */}
        <span
          role="tooltip"
          className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-[#3E2914] text-[#FBF6EE] text-[11px] font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity shadow-md z-50"
        >
          Account
        </span>
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Account options"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E0D5] shadow-xl p-2 z-50 animate-fade-in text-xs space-y-1"
        >
          <div className="px-3 py-2 border-b border-[#F3EBDD]">
            <p className="font-semibold text-[#1A1A1A] truncate">{displayName}</p>
            <p className="text-[11px] text-[#6B6B6B] truncate">{user.email}</p>
          </div>

          <Link
            href="/account#orders"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1A1A] hover:bg-[#FDFBF7] hover:text-[#5C3D1E] transition-colors"
          >
            <svg className="w-4 h-4 text-[#C9952A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>My Orders</span>
          </Link>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1A1A] hover:bg-[#FDFBF7] hover:text-[#5C3D1E] transition-colors"
          >
            <svg className="w-4 h-4 text-[#4A7FA5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </Link>

          <div className="pt-1 border-t border-[#F3EBDD]">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
