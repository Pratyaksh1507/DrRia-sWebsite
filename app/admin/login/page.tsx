'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSessionTimeout = searchParams.get('error') === 'session_timeout';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(
    isSessionTimeout ? 'Your admin session timed out due to inactivity. Please sign in again.' : ''
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      if (data.mfaStep === 'enroll') {
        router.push('/admin/mfa/enroll');
      } else if (data.mfaStep === 'challenge') {
        router.push('/admin/mfa/challenge');
      } else {
        router.push('/admin');
      }
    } catch (err: unknown) {
      console.error('[Admin Login UI Exception]', err);
      setErrorMsg('Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FBF6EE]">
      <div className="w-full max-w-md bg-white/90 border border-[#E8E0D5] rounded-2xl p-8 shadow-sm">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <span className="font-serif text-2xl font-bold text-[#5C3D1E]">
            Dr Ria&apos;s
          </span>
          <div className="flex justify-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C9952A] text-[#3E2914] uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
          <p className="text-xs text-[#5C3D1E]/70 pt-1">
            Restricted access. Authorized personnel only.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-[#5C3D1E] mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E8E0D5] bg-[#FAF4EA]/50 text-[#1A1A1A] placeholder-[#5C3D1E]/40 focus:outline-none focus:ring-2 focus:ring-[#C9952A] focus:border-transparent transition-all"
              placeholder="admin@drrias.in"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#5C3D1E] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E8E0D5] bg-[#FAF4EA]/50 text-[#1A1A1A] placeholder-[#5C3D1E]/40 focus:outline-none focus:ring-2 focus:ring-[#C9952A] focus:border-transparent transition-all"
              placeholder="••••••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold bg-[#5C3D1E] text-[#FBF6EE] hover:bg-[#3E2914] focus:outline-none focus:ring-2 focus:ring-[#C9952A] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FBF6EE]">
          <div className="text-sm font-medium text-[#5C3D1E]">Loading...</div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

