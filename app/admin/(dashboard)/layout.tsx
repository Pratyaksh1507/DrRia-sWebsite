import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav';

export const instant = false;

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF6EE]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#5C3D1E] text-[#FBF6EE] border-b border-[#7A532B] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 group">
            <span className="font-serif text-xl font-bold tracking-tight text-[#FBF6EE]">
              Dr Ria&apos;s
            </span>
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#C9952A] text-[#3E2914] uppercase tracking-wider">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-[#E8E0D5]/70">Signed in as</span>
            <span className="text-sm font-medium text-[#FBF6EE] truncate max-w-[220px]">
              {user.email}
            </span>
          </div>

          <form action="/api/admin/signout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#FBF6EE] bg-[#3E2914] hover:bg-[#2A1B0D] border border-[#7A532B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
            >
              <svg
                className="w-4 h-4 text-[#C9952A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Shell: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-60 shrink-0 hidden md:block">
          <AdminSidebarNav />
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
