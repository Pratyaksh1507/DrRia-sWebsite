'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function UserNav() {
  const router = useRouter();
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-xs font-semibold text-[#5C3D1E] hover:text-[#C9952A] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#F3EBDD] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
        aria-label="Sign in to your account"
      >
        Sign In
      </Link>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'My Account';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-[#F3EBDD] text-[#5C3D1E] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
      >
        <div className="w-7 h-7 rounded-full bg-[#5C3D1E] text-white flex items-center justify-center text-xs font-bold uppercase shadow-2xs">
          {displayName[0]}
        </div>
        <span className="hidden lg:inline text-xs font-semibold max-w-[100px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-[#5C3D1E] transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
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
            href="/account#addresses"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1A1A] hover:bg-[#FDFBF7] hover:text-[#5C3D1E] transition-colors"
          >
            <svg className="w-4 h-4 text-[#3A7D44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span>Saved Addresses</span>
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
            <span>Profile Settings</span>
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
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
