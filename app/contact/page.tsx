'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email) {
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    }
  };

  return (
    <div className="py-16 sm:py-24 bg-[#FBF6EE]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#C9952A]">
            Direct Concierge
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3E2914] mt-1">
            Contact Dr Ria&apos;s
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Have a question regarding our ingredients, patch testing, or an existing order? We are here to assist.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Contact Information Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E8E0D5] shadow-xs space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#1A1A1A]">
                Customer Support Details
              </h2>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <strong className="block text-[#1A1A1A] mb-1">Direct Calling Line:</strong>
                  <a
                    href="tel:+919469088317"
                    className="text-[#5C3D1E] hover:text-[#C9952A] font-semibold underline underline-offset-2"
                  >
                    +91-9469088317
                  </a>
                  <span className="block text-[11px] text-[#6B6B6B] mt-0.5">
                    Available Mon–Sat, 10:00 AM – 7:00 PM IST
                  </span>
                </div>

                <div>
                  <strong className="block text-[#1A1A1A] mb-1">Official Email:</strong>
                  <a
                    href="mailto:simplyria11@gmail.com"
                    className="text-[#5C3D1E] hover:text-[#C9952A] font-semibold underline underline-offset-2"
                  >
                    simplyria11@gmail.com
                  </a>
                  <span className="block text-[11px] text-[#6B6B6B] mt-0.5">
                    Response within 24 business hours
                  </span>
                </div>

                <div>
                  <strong className="block text-[#1A1A1A] mb-1">Registered Address:</strong>
                  <p className="text-[#6B6B6B] leading-relaxed">
                    93-C Shastri Nagar, Jammu, Jammu &amp; Kashmir, 180004, India
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://wa.me/919469088317"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3A7D44] text-white text-xs font-semibold hover:bg-[#306637] transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.832.898 2.791.898h.001c3.182 0 5.77-2.587 5.77-5.767 0-3.18-2.587-5.766-5.77-5.766zm9.969 5.767c0 5.518-4.482 10-10 10-1.748 0-3.385-.45-4.814-1.239l-5.186 1.358 1.385-5.059c-.87-1.488-1.385-3.218-1.385-5.06 0-5.518 4.482-10 10-10 5.518 0 10 4.482 10 10z"/>
                  </svg>
                  <span>Chat on WhatsApp (+91-9469088317)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-2xl border border-[#E8E0D5] shadow-xs">
            <h2 className="font-serif text-xl font-bold text-[#1A1A1A] mb-4">
              Send Us a Message
            </h2>

            {submitted ? (
              <div className="p-6 rounded-xl bg-[#EDF6EE] border border-[#C5E5C9] text-center space-y-2">
                <p className="font-serif text-lg font-bold text-[#3A7D44]">
                  Message Received!
                </p>
                <p className="text-xs text-[#1A1A1A]">
                  Thank you for reaching out. A skincare specialist will review your note and reply within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-3 px-4 py-2 rounded-lg bg-[#3A7D44] text-white text-xs font-semibold"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Your Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Subject / Order Reference
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Question on Hair Growth Oil / Order #DRRIA-123"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help your skincare journey?"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E0D5] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#5C3D1E]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#5C3D1E] text-white text-sm font-semibold hover:bg-[#C9952A] transition-colors shadow-xs"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
