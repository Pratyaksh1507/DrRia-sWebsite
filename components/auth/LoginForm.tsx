'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import OtpInput from './OtpInput';

const emailSchema = z.string().email('Please enter a valid email address');
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number');

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/account';

  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const phoneOtpEnabled = process.env.NEXT_PUBLIC_ENABLE_PHONE_OTP === 'true';

  // 30s Resend Cooldown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const supabase = createClient();

  // 1. Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate Google sign in.');
      setLoading(false);
    }
  };

  // 2. Request Email / Phone OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (authMode === 'email') {
      const validation = emailSchema.safeParse(email.trim());
      if (!validation.success) {
        setErrorMessage(validation.error.issues[0].message);
        return;
      }
    } else {
      const validation = phoneSchema.safeParse(phone.trim());
      if (!validation.success) {
        setErrorMessage(validation.error.issues[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      if (authMode === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: true,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: `+91${phone.trim()}`,
        });
        if (error) throw error;
      }

      setStep('verify');
      setCooldown(30);
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify 6-digit OTP Code
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      if (authMode === 'email') {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code,
          type: 'email',
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `+91${phone.trim()}`,
          token: code,
          type: 'sms',
        });
        if (error) throw error;
      }

      // Successful verification! Redirect to next destination
      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code. Please check and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl border border-[#E8E0D5] p-6 sm:p-8 shadow-xs">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#3E2914]">
          {step === 'request' ? 'Sign In / Register' : 'Enter Verification Code'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#6B6B6B]">
          {step === 'request'
            ? 'Access your orders, saved addresses, and faster checkout.'
            : `We sent a 6-digit code to ${authMode === 'email' ? email : `+91 ${phone}`}`}
        </p>
      </div>

      {/* Accessible Error Announcement */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"
        >
          <svg className="w-4 h-4 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 1118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {step === 'request' ? (
        <div className="space-y-5">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl border border-[#E8E0D5] bg-white hover:bg-[#FDFBF7] text-[#1A1A1A] text-sm font-semibold flex items-center justify-center gap-3 transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
          >
            {/* Google SVG Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E8E0D5] w-full" />
            <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold absolute">
              Or continue with
            </span>
          </div>

          {/* Mode Switch Tabs (Only when phone OTP is enabled) */}
          {phoneOtpEnabled && (
            <div className="flex border border-[#E8E0D5] rounded-xl p-1 bg-[#FDFBF7]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('email');
                  setErrorMessage('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'email' ? 'bg-[#5C3D1E] text-white shadow-xs' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                }`}
              >
                Email OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone');
                  setErrorMessage('');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'phone' ? 'bg-[#5C3D1E] text-white shadow-xs' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                }`}
              >
                Mobile OTP
              </button>
            </div>
          )}

          {/* Request Form */}
          <form onSubmit={handleSendOtp} className="space-y-4">
            {authMode === 'email' ? (
              <div>
                <label htmlFor="email-input" className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E0D5] bg-white text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] transition-all"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="phone-input" className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                  Mobile Number (India)
                </label>
                <div className="flex items-center rounded-xl border border-[#E8E0D5] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#5C3D1E]">
                  <span className="px-3.5 text-sm font-semibold text-[#5C3D1E] bg-[#FDFBF7] border-r border-[#E8E0D5] py-3">
                    +91
                  </span>
                  <input
                    id="phone-input"
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    disabled={loading}
                    autoComplete="tel-national"
                    maxLength={10}
                    className="w-full px-3 py-3 text-sm text-[#1A1A1A] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#7A532B] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        </div>
      ) : (
        /* OTP Verification Step */
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-center text-[#1A1A1A] mb-3">
              Enter 6-Digit One-Time Code
            </label>
            <OtpInput
              value={otpCode}
              onChange={setOtpCode}
              onComplete={handleVerifyOtp}
              disabled={loading}
              error={!!errorMessage}
            />
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-[#6B6B6B]">
              Code expires in 10 minutes.
            </p>

            <div className="flex items-center justify-center gap-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={cooldown > 0 || loading}
                className="text-[#5C3D1E] hover:underline disabled:opacity-40 disabled:no-underline font-semibold"
              >
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
              </button>
              <span className="text-[#E8E0D5]">&bull;</span>
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setOtpCode('');
                  setErrorMessage('');
                }}
                className="text-[#6B6B6B] hover:text-[#1A1A1A] underline"
              >
                Change {authMode === 'email' ? 'Email' : 'Number'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleVerifyOtp()}
            disabled={otpCode.length !== 6 || loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#7A532B] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D1E] disabled:opacity-40"
          >
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>
        </div>
      )}

      {/* Legal & Trust Consent */}
      <div className="mt-6 pt-5 border-t border-[#F3EBDD] text-center">
        <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
          By continuing, you agree to our{' '}
          <Link href="/policies/terms" className="text-[#5C3D1E] underline hover:text-[#C9952A]">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/policies/privacy" className="text-[#5C3D1E] underline hover:text-[#C9952A]">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}
