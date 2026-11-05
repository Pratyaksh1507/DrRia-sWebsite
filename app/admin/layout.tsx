import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: "Admin Portal | Dr Ria's",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FBF6EE] text-[#1A1A1A] flex flex-col font-sans selection:bg-[#C9952A]/20 selection:text-[#5C3D1E]">
      {children}
    </div>
  );
}
