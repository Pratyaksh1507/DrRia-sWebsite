'use client';

import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section className="py-16 bg-[#5C3D1E] text-[#FBF6EE]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
          Join the Circle
        </span>
        <h2 className="font-serif text-3xl font-bold">
          Skincare Insights &amp; Product Updates
        </h2>
        <p className="text-xs sm:text-sm text-[#E8E0D5]/80 max-w-lg mx-auto">
          Subscribe for product launches, seasonal care tips, and brand updates.
        </p>

        {subscribed ? (
          <div className="p-4 rounded-xl bg-[#3A7D44] text-white text-sm max-w-md mx-auto">
            Thank you for subscribing! You are on the insider list.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              aria-label="Email address for newsletter"
              className="flex-1 px-4 py-3 rounded-xl bg-white text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9952A]"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#C9952A] text-white text-sm font-semibold hover:bg-[#B28221] transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
