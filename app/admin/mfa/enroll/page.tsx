'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminMfaEnrollPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function initEnrollment() {
      try {
        const res = await fetch('/api/admin/mfa/enroll');
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/admin/login');
            return;
          }
          setErrorMsg(data.error || 'Failed to start MFA enrollment');
          setLoading(false);
          return;
        }

        setFactorId(data.factorId);
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setLoading(false);
      } catch (err: unknown) {
        console.error('[MFA Enroll Init Error]', err);
        setErrorMsg('Failed to initialize MFA enrollment');
        setLoading(false);
      }
    }

    initEnrollment();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit code');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId,
          code: verificationCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Verification failed. Please check the code.');
        setSubmitting(false);
        return;
      }

      router.push('/admin');
    } catch (err: unknown) {
      console.error('[MFA Enroll Verify Error]', err);
      setErrorMsg('Verification failed. Please try again.');
      setSubmitting(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FBF6EE]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-[#C9952A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#5C3D1E]">
            Preparing authenticator setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FBF6EE]">
      <div className="w-full max-w-lg bg-white/90 border border-[#E8E0D5] rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <span className="font-serif text-2xl font-bold text-[#5C3D1E]">
            Dr Ria&apos;s
          </span>
          <h1 className="text-lg font-semibold text-[#1A1A1A]">
            Set Up Two-Factor Authentication
          </h1>
          <p className="text-xs text-[#5C3D1E]/70 max-w-sm mx-auto">
            Scan this QR code using Google Authenticator, 1Password, or Apple Keychain to protect your admin access.
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

        {/* QR Code Container */}
        {qrCode && (
          <div className="flex flex-col items-center justify-center p-4 bg-[#FAF4EA] rounded-xl border border-[#E8E0D5] mb-6">
            <div className="bg-white p-3 rounded-lg shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="TOTP Enrollment QR Code"
                width={224}
                height={224}
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>

            {/* Secret Key for manual input */}
            {secret && (
              <div className="mt-4 w-full text-center">
                <span className="text-[11px] font-medium text-[#5C3D1E]/70 block mb-1">
                  Or enter secret key manually:
                </span>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-[#E8E0D5] text-[#5C3D1E] select-all">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="text-xs text-[#5C3D1E] hover:text-[#C9952A] font-medium underline transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label
              htmlFor="verificationCode"
              className="block text-xs font-semibold uppercase tracking-wider text-[#5C3D1E] mb-1.5 text-center"
            >
              Enter 6-Digit Code
            </label>
            <input
              id="verificationCode"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
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
            {submitting ? 'Verifying...' : 'Verify & Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
