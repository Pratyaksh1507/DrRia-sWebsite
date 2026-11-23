'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminMfaChallengePage() {
  const router = useRouter();

  const [verificationCode, setVerificationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit authenticator code');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid verification code. Please check your authenticator app.');
        setSubmitting(false);
        return;
      }

      router.push('/admin');
    } catch (err: unknown) {
      console.error('[MFA Challenge Verify Error]', err);
      setErrorMsg('Verification failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FBF6EE]">
      <div className="w-full max-w-md bg-white/90 border border-[#E8E0D5] rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <span className="font-serif text-2xl font-bold text-[#5C3D1E]">
            Dr Ria&apos;s
          </span>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">
            Two-Factor Authentication
          </h1>
          <p className="text-xs text-[#5C3D1E]/70 max-w-xs mx-auto">
            Enter the 6-digit code from your authenticator app to confirm your identity.
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

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label
              htmlFor="verificationCode"
              className="block text-xs font-semibold uppercase tracking-wider text-[#5C3D1E] mb-1.5 text-center"
            >
              Authentication Code
            </label>
            <input
              id="verificationCode"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              required
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 px-4 rounded-xl border border-[#E8E0D5] bg-[#FAF4EA]/50 text-[#1A1A1A] placeholder-[#5C3D1E]/30 focus:outline-none focus:ring-2 focus:ring-[#C9952A] focus:border-transparent transition-all"
              placeholder="000000"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || verificationCode.length !== 6}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-[#5C3D1E] text-[#FBF6EE] hover:bg-[#3E2914] focus:outline-none focus:ring-2 focus:ring-[#C9952A] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {submitting ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E8E0D5] text-center">
          <form action="/api/admin/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-[#5C3D1E]/70 hover:text-[#5C3D1E] font-medium transition-colors"
            >
              Sign out and return to login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

