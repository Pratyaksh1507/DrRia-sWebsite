import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In / Register',
  description: 'Sign in to access your Dr Ria’s account, track orders, and manage saved delivery addresses.',
};

export default function LoginPage() {
  return (
    <div className="py-16 sm:py-24 bg-[#FBF6EE] min-h-[calc(100vh-5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="text-center py-16 text-sm text-[#6B6B6B]">Loading sign-in...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

