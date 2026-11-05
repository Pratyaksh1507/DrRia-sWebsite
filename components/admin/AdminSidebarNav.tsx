'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebarNav() {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      active: pathname === '/admin',
      comingSoon: false,
      icon: (
        <svg className="w-4 h-4 text-[#C9952A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: 'Products',
      href: '/admin/products',
      active: pathname.startsWith('/admin/products'),
      comingSoon: false,
      icon: (
        <svg className="w-4 h-4 text-[#C9952A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: 'Orders',
      href: '#',
      active: false,
      comingSoon: true,
      icon: (
        <svg className="w-4 h-4 text-[#5C3D1E]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      name: 'Coupons',
      href: '#',
      active: false,
      comingSoon: true,
      icon: (
        <svg className="w-4 h-4 text-[#5C3D1E]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      name: 'Analytics',
      href: '#',
      active: false,
      comingSoon: true,
      icon: (
        <svg className="w-4 h-4 text-[#5C3D1E]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="sticky top-24 space-y-1.5 bg-[#FAF4EA] border border-[#E8E0D5] rounded-xl p-3 shadow-xs">
      {navigationItems.map((item) => (
        <div key={item.name}>
          {!item.comingSoon ? (
            <Link
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                item.active
                  ? 'bg-[#5C3D1E] text-[#FBF6EE] shadow-xs'
                  : 'text-[#5C3D1E] hover:bg-[#F3EBDD]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.name}</span>
              </div>
            </Link>
          ) : (
            <div
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#5C3D1E]/50 cursor-not-allowed select-none"
              aria-disabled="true"
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.name}</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8E0D5]/70 text-[#5C3D1E]/70 uppercase tracking-wider">
                Soon
              </span>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

